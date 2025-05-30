from flask import Flask, render_template, jsonify, request
import pandas as pd
import os
import logging
import json
from datetime import datetime
from json import JSONEncoder
from functools import lru_cache
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)  # Changed to INFO to reduce logging overhead
logger = logging.getLogger(__name__)

# Custom JSON encoder to handle pandas Timestamp objects
class CustomJSONEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (pd.Timestamp, datetime)):
            return obj.strftime('%Y-%m-%d')
        if pd.isna(obj):
            return None
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        return super().default(obj)

app = Flask(__name__)
app.json_encoder = CustomJSONEncoder

# Global variables
df = None
CHUNK_SIZE = 1000  # Number of records to process at once
CACHE_SIZE = 128   # Number of cached results

def load_data():
    """Load data from Excel file with optimized memory usage"""
    global df
    try:
        if df is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            excel_path = os.path.join(current_dir, 'data', 'claims_data.xlsx')
            
            if not os.path.exists(excel_path):
                logger.error(f"Excel file not found at: {excel_path}")
                return pd.DataFrame()
            
            # First read without any parsing to get the actual column names
            df = pd.read_excel(excel_path)
            logger.info(f"Original columns: {df.columns.tolist()}")
            
            # Map the actual column names to our expected names
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
            
            # Now read the file again with proper parsing
            df = pd.read_excel(
                excel_path,
                dtype={
                    'Claim Status': 'category',
                    'Product Line': 'category',
                    'Warranty Type-Final': 'category',
                    'TAT': 'float32',
                    'Credit to Customer': 'float32',
                    'Requested Credits': 'float32'
                },
                parse_dates=['Claim Submitted Date', 'Claim Close Date']
            )
            
            # Rename columns after reading
            for old_col, new_col in column_mapping.items():
                if old_col in df.columns:
                    df = df.rename(columns={old_col: new_col})
            
            # Optimize memory usage
            for col in df.select_dtypes(include=['object']).columns:
                df[col] = df[col].astype('category')
            
            logger.info(f"Loaded data shape: {df.shape}")
            logger.info(f"Final columns: {df.columns.tolist()}")
        
        return df
    except Exception as e:
        logger.error(f"Error loading data: {str(e)}", exc_info=True)
        return pd.DataFrame()

@lru_cache(maxsize=CACHE_SIZE)
def get_summary_stats():
    """Get cached summary statistics"""
    data = load_data()
    if data.empty:
        return {
            'total_records': 0,
            'total_claims': 0,
            'approved_claims': 0,
            'disallowed_claims': 0,
            'total_credits': 0,
            'avg_tat': 0
        }
    
    # Use vectorized operations for better performance
    approved_mask = data['Claim Status'] == 'Approved'
    disallowed_mask = data['Claim Status'] == 'Disallowed'
    
    return {
        'total_records': len(data),
        'total_claims': len(data),
        'approved_claims': int(approved_mask.sum()),
        'disallowed_claims': int(disallowed_mask.sum()),
        'total_credits': float(data['Credited Amount'].sum()),
        'avg_tat': float(data['TAT'].mean())
    }

def process_data_chunk(data_chunk):
    """Process a chunk of data efficiently"""
    try:
        # Convert to records and process
        records = data_chunk.to_dict(orient='records')
        processed_records = []
        
        for record in records:
            processed_record = {}
            
            # Process numeric fields
            for key in ['Credited Amount', 'Requested Credits', 'TAT']:
                if key in record:
                    value = record[key]
                    if pd.isna(value):
                        processed_record[key] = 0
                    elif isinstance(value, (int, float)):
                        processed_record[key] = float(value)
                    else:
                        try:
                            processed_record[key] = float(str(value).replace('$', '').replace(',', ''))
                        except (ValueError, TypeError):
                            processed_record[key] = 0
                else:
                    processed_record[key] = 0
            
            # Process date fields
            date_columns = {
                'Claim Submitted Date': 'Claim Submission Date',
                'Claim Close Date': 'Claim Close Date'
            }
            
            for old_key, new_key in date_columns.items():
                if old_key in record and pd.notna(record[old_key]):
                    if isinstance(record[old_key], (pd.Timestamp, datetime)):
                        processed_record[new_key] = record[old_key].strftime('%Y-%m-%d')
                    else:
                        try:
                            processed_record[new_key] = pd.to_datetime(record[old_key]).strftime('%Y-%m-%d')
                        except:
                            processed_record[new_key] = '-'
                else:
                    processed_record[new_key] = '-'
            
            # Copy other fields
            for key, value in record.items():
                if key not in processed_record:
                    processed_record[key] = None if pd.isna(value) else value
            
            processed_records.append(processed_record)
        
        return processed_records
    except Exception as e:
        logger.error(f"Error processing data chunk: {str(e)}", exc_info=True)
        return []

@app.route('/')
def index():
    """Render the main dashboard with optimized initial data loading"""
    try:
        # Get cached summary statistics
        summary = get_summary_stats()
        
        # Load only first chunk of data for initial render
        data = load_data()
        if data.empty:
            return render_template('index.html', 
                                 claims_data=json.dumps([]),
                                 summary=json.dumps(summary))
        
        # Process only the first chunk
        initial_data = data.iloc[:CHUNK_SIZE]
        processed_data = process_data_chunk(initial_data)
        
        return render_template('index.html', 
                             claims_data=json.dumps(processed_data),
                             summary=json.dumps(summary))
    except Exception as e:
        logger.error(f"Error in index route: {str(e)}", exc_info=True)
        return render_template('index.html', 
                             claims_data=json.dumps([]),
                             summary=json.dumps(get_summary_stats()))

@app.route('/api/data')
def get_data():
    """API endpoint to get paginated claim data"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', CHUNK_SIZE))
        
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
        
        # Process the data chunk
        processed_data = process_data_chunk(page_data)
        
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
            'per_page': CHUNK_SIZE,
            'total_pages': 0
        })

@app.route('/api/summary')
def get_summary():
    """API endpoint to get cached summary statistics"""
    try:
        return jsonify(get_summary_stats())
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