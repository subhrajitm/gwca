from flask import Flask, render_template, jsonify
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

def load_data():
    """Load data from Excel file"""
    try:
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
        logger.debug(f"DataFrame columns: {df.columns.tolist()}")
        
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
        
        # Convert DataFrame to list of dictionaries
        data = df.to_dict(orient='records')
        logger.debug(f"Converted to records. Number of records: {len(data)}")
        logger.debug(f"First record sample: {data[0] if data else 'No data'}")
        
        # Format numeric and date columns
        processed_data = []
        for record in data:
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
            
            processed_data.append(processed_record)
        
        logger.debug(f"Processed data length: {len(processed_data)}")
        logger.debug(f"First processed record: {processed_data[0] if processed_data else 'No data'}")
        return processed_data
    except Exception as e:
        logger.error(f"Error loading data: {str(e)}", exc_info=True)
        return []

@app.route('/')
def index():
    """Render the main dashboard"""
    data = load_data()
    logger.debug(f"Number of records being passed to template: {len(data)}")
    logger.debug(f"Data type: {type(data)}")
    logger.debug(f"Data structure: {data[:1] if data else 'No data'}")
    
    # Ensure data is a list
    if not isinstance(data, list):
        logger.error(f"Data is not a list: {type(data)}")
        data = []
    
    return render_template('index.html', data=json.dumps(data, cls=CustomJSONEncoder))

@app.route('/api/data')
def get_data():
    """API endpoint to get claim data"""
    data = load_data()
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True, port=5000) 