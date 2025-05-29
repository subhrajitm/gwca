from flask import Flask, render_template, jsonify, request
import pandas as pd
import os
import logging
import json
from datetime import datetime
from json import JSONEncoder

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Custom JSON encoder to handle pandas Timestamp objects
class CustomJSONEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, pd.Timestamp):
            return obj.strftime('%Y-%m-%d')
        if isinstance(obj, datetime):
            return obj.strftime('%Y-%m-%d')
        if pd.isna(obj):
            return None
        return super().default(obj)

app = Flask(__name__)
app.json_encoder = CustomJSONEncoder

# Global variable to store the DataFrame
df = None

def load_data():
    """Load data from Excel file"""
    global df
    try:
        if df is None:
            # Get the absolute path to the Excel file
            current_dir = os.path.dirname(os.path.abspath(__file__))
            excel_path = os.path.join(current_dir, 'data', 'cdata.xlsx')
            
            logger.debug(f"Attempting to read Excel file from: {excel_path}")
            
            # Check if file exists
            if not os.path.exists(excel_path):
                logger.error(f"Excel file not found at: {excel_path}")
                return []
                
            # Read the Excel file
            df = pd.read_excel(excel_path)
            logger.debug(f"Successfully read Excel file. Shape: {df.shape}")
            
            # Rename columns to match expected format
            column_mapping = {
                'Credit to Customer': 'Credited Amount',
                'Claim Status': 'Claim Status',
                'Product Line': 'Product Line',
                'Warranty Type-Final': 'Warranty Type',
                'Claim Submitted Date': 'Claim Submission Date',
                'Claim Close Date': 'Claim Close Date',
                'TAT': 'TAT',
                'Requested Credits': 'Requested Credits'
            }
            
            # Rename columns that exist in the mapping
            for old_col, new_col in column_mapping.items():
                if old_col in df.columns:
                    df = df.rename(columns={old_col: new_col})
        
        return df
    except Exception as e:
        logger.error(f"Error loading data: {str(e)}", exc_info=True)
        return pd.DataFrame()

def process_data(data):
    """Process DataFrame records into formatted dictionaries"""
    try:
        # Convert DataFrame to list of dictionaries
        records = data.to_dict(orient='records')
        processed_records = []
        
        for record in records:
            processed_record = {}
            
            # Format numeric columns
            for key in ['Credited Amount', 'Requested Credits', 'TAT']:
                if key in record:
                    if pd.isna(record[key]):
                        processed_record[key] = 0
                    elif isinstance(record[key], (int, float)):
                        processed_record[key] = float(record[key])
                    else:
                        try:
                            processed_record[key] = float(str(record[key]).replace('$', '').replace(',', ''))
                        except (ValueError, TypeError):
                            processed_record[key] = 0
                else:
                    processed_record[key] = 0
            
            # Format date columns
            for key in ['Claim Submission Date', 'Claim Close Date', 'Incident Date']:
                if key in record and pd.notna(record[key]):
                    if isinstance(record[key], (pd.Timestamp, datetime)):
                        processed_record[key] = record[key].strftime('%Y-%m-%d')
                    else:
                        try:
                            processed_record[key] = pd.to_datetime(record[key]).strftime('%Y-%m-%d')
                        except:
                            processed_record[key] = '-'
                else:
                    processed_record[key] = '-'
            
            # Copy other fields
            for key, value in record.items():
                if key not in processed_record:
                    processed_record[key] = None if pd.isna(value) else value
            
            processed_records.append(processed_record)
        
        return processed_records
    except Exception as e:
        logger.error(f"Error processing data: {str(e)}", exc_info=True)
        return []

def clean_numeric_value(value):
    """Clean and convert a value to float, handling various formats"""
    try:
        if isinstance(value, pd.Series):
            # If it's a Series, get the first value
            value = value.iloc[0] if not value.empty else None
            
        if pd.isna(value) or value is None:
            return 0.0
            
        if isinstance(value, (int, float)):
            return float(value)
            
        # Remove currency symbols, commas, and other non-numeric characters
        cleaned = str(value).replace('$', '').replace(',', '').strip()
        # Try to convert to float
        return float(cleaned) if cleaned else 0.0
    except (ValueError, TypeError, IndexError):
        return 0.0

def process_numeric_column(series):
    """Process a pandas Series column to clean numeric values"""
    try:
        # Convert to string first to handle any type
        str_series = series.astype(str)
        # Remove currency symbols and commas
        cleaned = str_series.str.replace('$', '').str.replace(',', '')
        # Convert to float, replacing any errors with 0
        return pd.to_numeric(cleaned, errors='coerce').fillna(0)
    except Exception:
        return pd.Series([0.0] * len(series))

@app.route('/')
def index():
    """Render the main dashboard"""
    # Load initial data for summary statistics
    data = load_data()
    if data.empty:
        return render_template('index.html', data=json.dumps([]))
    
    try:
        # Get summary statistics
        approved_mask = data['Claim Status'] == 'Approved'
        disallowed_mask = data['Claim Status'] == 'Disallowed'
        
        # Clean and convert numeric columns
        credited_amounts = process_numeric_column(data['Credited Amount'])
        tat_values = process_numeric_column(data['TAT'])
        
        summary = {
            'total_records': int(len(data)),
            'total_claims': int(len(data)),
            'approved_claims': int(approved_mask.sum()),
            'disallowed_claims': int(disallowed_mask.sum()),
            'total_credits': float(credited_amounts.sum()),
            'avg_tat': float(tat_values.mean())
        }
        
        return render_template('index.html', 
                             data=json.dumps([]),  # Empty initial data
                             summary=json.dumps(summary))
    except Exception as e:
        logger.error(f"Error in index route: {str(e)}", exc_info=True)
        return render_template('index.html', 
                             data=json.dumps([]),
                             summary=json.dumps({
                                 'total_records': 0,
                                 'total_claims': 0,
                                 'approved_claims': 0,
                                 'disallowed_claims': 0,
                                 'total_credits': 0,
                                 'avg_tat': 0
                             }))

@app.route('/api/data')
def get_data():
    """API endpoint to get paginated claim data"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 1000))
        
        data = load_data()
        if data.empty:
            return jsonify({
                'data': [],
                'total': 0,
                'page': page,
                'per_page': per_page,
                'total_pages': 0
            })
        
        # Calculate pagination
        total_records = len(data)
        total_pages = (total_records + per_page - 1) // per_page
        
        # Get the slice of data for the current page
        start_idx = (page - 1) * per_page
        end_idx = min(start_idx + per_page, total_records)
        page_data = data.iloc[start_idx:end_idx]
        
        # Process the data
        processed_data = process_data(page_data)
        
        return jsonify({
            'data': processed_data,
            'total': total_records,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages
        })
    except Exception as e:
        logger.error(f"Error in get_data: {str(e)}", exc_info=True)
        return jsonify({
            'error': str(e),
            'data': [],
            'total': 0,
            'page': 1,
            'per_page': 1000,
            'total_pages': 0
        })

@app.route('/api/summary')
def get_summary():
    """API endpoint to get summary statistics"""
    try:
        data = load_data()
        if data.empty:
            return jsonify({
                'total_records': 0,
                'total_claims': 0,
                'approved_claims': 0,
                'disallowed_claims': 0,
                'total_credits': 0,
                'avg_tat': 0
            })
        
        approved_mask = data['Claim Status'] == 'Approved'
        disallowed_mask = data['Claim Status'] == 'Disallowed'
        
        # Clean and convert numeric columns
        credited_amounts = process_numeric_column(data['Credited Amount'])
        tat_values = process_numeric_column(data['TAT'])
        
        summary = {
            'total_records': int(len(data)),
            'total_claims': int(len(data)),
            'approved_claims': int(approved_mask.sum()),
            'disallowed_claims': int(disallowed_mask.sum()),
            'total_credits': float(credited_amounts.sum()),
            'avg_tat': float(tat_values.mean())
        }
        
        return jsonify(summary)
    except Exception as e:
        logger.error(f"Error in get_summary: {str(e)}", exc_info=True)
        return jsonify({
            'error': str(e),
            'total_records': 0,
            'total_claims': 0,
            'approved_claims': 0,
            'disallowed_claims': 0,
            'total_credits': 0,
            'avg_tat': 0
        })

if __name__ == '__main__':
    app.run(debug=True, port=5000) 