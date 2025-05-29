from flask import Flask, render_template, jsonify
import pandas as pd
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

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
        
        # Rename columns to match expected format
        column_mapping = {
            'Credit to Customer': 'Credited Amount',
            'Claim Status': 'Claim Status',
            'Product Line': 'Product Line',
            'Warranty Type': 'Warranty Type',
            'Claim Submission Date': 'Claim Submission Date',
            'Claim Close Date': 'Claim Close Date',
            'TAT': 'TAT',
            'Requested Credits': 'Requested Credits'
        }
        
        # Rename columns that exist in the mapping
        for old_col, new_col in column_mapping.items():
            if old_col in df.columns:
                df = df.rename(columns={old_col: new_col})
        
        # Convert DataFrame to list of dictionaries
        data = df.to_dict('records')
        logger.debug(f"Converted to records. Number of records: {len(data)}")
        
        # Clean up the data
        for record in data:
            # Convert numeric columns to proper format
            if 'Credited Amount' in record:
                try:
                    # Remove any currency symbols and commas, then convert to float
                    amount_str = str(record['Credited Amount']).replace('$', '').replace(',', '')
                    amount = float(amount_str)
                    record['Credited Amount'] = f"${amount:,.2f}"
                except (ValueError, TypeError):
                    logger.warning(f"Invalid credit amount format: {record['Credited Amount']}")
                    record['Credited Amount'] = "$0.00"
                    
            if 'Requested Credits' in record:
                try:
                    # Remove any currency symbols and commas, then convert to float
                    amount_str = str(record['Requested Credits']).replace('$', '').replace(',', '')
                    amount = float(amount_str)
                    record['Requested Credits'] = f"${amount:,.2f}"
                except (ValueError, TypeError):
                    logger.warning(f"Invalid requested credits format: {record['Requested Credits']}")
                    record['Requested Credits'] = "$0.00"
                    
            if 'TAT' in record:
                try:
                    record['TAT'] = str(int(record['TAT']))
                except (ValueError, TypeError):
                    record['TAT'] = "0"
            
            # Convert date columns to proper format
            date_columns = ['Claim Submission Date', 'Claim Close Date']
            for col in date_columns:
                if col in record and pd.notna(record[col]):
                    try:
                        record[col] = pd.to_datetime(record[col]).strftime('%Y-%m-%d')
                    except:
                        record[col] = '-'
                else:
                    record[col] = '-'
        
        logger.debug("Data processing completed successfully")
        return data
    except Exception as e:
        logger.error(f"Error loading data: {str(e)}", exc_info=True)
        return []

@app.route('/')
def index():
    """Render the main dashboard"""
    data = load_data()
    logger.debug(f"Number of records being passed to template: {len(data)}")
    return render_template('index.html', data=data)

@app.route('/api/data')
def get_data():
    """API endpoint to get claim data"""
    data = load_data()
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True, port=5000) 