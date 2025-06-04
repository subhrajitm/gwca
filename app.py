from flask import Flask, render_template, jsonify, request
import pandas as pd
import os
import json
from datetime import datetime
from json import JSONEncoder
from functools import lru_cache
import numpy as np
from typing import Dict, List, Any

# Global variables
df = None
CHUNK_SIZE = 1000
CACHE_SIZE = 128

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

def load_data():
    """Load data synchronously"""
    global df
    if df is not None:
        return df
    
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        excel_path = os.path.join(current_dir, 'data', 'claims_data.xlsx')
        
        if not os.path.exists(excel_path):
            print(f"Excel file not found at: {excel_path}")
            return None
        
        # Read Excel file with specific dtypes
        df = pd.read_excel(
            excel_path,
            dtype={
                'Credit to Customer': str,
                'Claim Status': str,
                'Product Line': str,
                'Warranty Type_Final': str,
                'Claim Submitted Date': str,
                'Claim Close Date': str,
                'TAT': str,
                'Requested Credits': str
            }
        )
        
        # Rename columns
        column_mapping = {
            'Credit to Customer': 'Credited Amount',
            'Claim Status': 'Claim Status',
            'Product Line': 'Product Line',
            'Warranty Type_Final': 'Warranty Type',
            'Claim Submitted Date': 'Claim Submitted Date',
            'Claim Close Date': 'Claim Close Date',
            'TAT': 'TAT',
            'Requested Credits': 'Requested Credits'
        }
        df = df.rename(columns=column_mapping)
        
        # Process numeric columns
        numeric_columns = ['Credited Amount', 'Requested Credits', 'TAT']
        for col in numeric_columns:
            if col in df.columns:
                if col == 'Credited Amount' and 'Credit to Customer' in df.columns:
                    # Clean and convert credit amount
                    df[col] = pd.to_numeric(
                        df['Credit to Customer'].str.replace('$', '').str.replace(',', ''),
                        errors='coerce'
                    )
                    df = df.drop('Credit to Customer', axis=1)
                else:
                    # Clean and convert other numeric columns
                    df[col] = pd.to_numeric(
                        df[col].str.replace('$', '').str.replace(',', ''),
                        errors='coerce'
                    )
                df[col] = df[col].fillna(0)
        
        # Process date columns
        date_columns = ['Claim Submitted Date', 'Claim Close Date']
        for col in date_columns:
            if col in df.columns:
                # Convert to datetime and handle NaT values
                df[col] = pd.to_datetime(df[col], errors='coerce')
                # Replace NaT with None before converting to string
                df[col] = df[col].apply(lambda x: x.strftime('%Y-%m-%d') if pd.notna(x) else None)
        
        # Process categorical columns
        categorical_columns = ['Claim Status', 'Product Line', 'Warranty Type']
        for col in categorical_columns:
            if col in df.columns:
                df[col] = df[col].fillna('Unknown').astype('category')
        
        return df
        
    except Exception as e:
        print(f"Error loading data: {str(e)}")
        return None

@lru_cache(maxsize=CACHE_SIZE)
def get_summary_stats():
    """Get cached summary statistics"""
    try:
        data = load_data()
        if data is None or data.empty:
            return {
                'total_records': 0,
                'total_claims': 0,
                'approved_claims': 0,
                'disallowed_claims': 0,
                'total_credits': 0,
                'avg_credit': 0,
                'max_credit': 0,
                'min_tat': 0,
                'max_tat': 0,
                'avg_tat': 0,
                'success_rate': 0,
                'approval_rate': 0,
                'rejection_rate': 0
            }
        
        # Calculate basic statistics
        total_claims = len(data)
        approved_claims = int((data['Claim Status'] == 'Approved').sum())
        disallowed_claims = int((data['Claim Status'] == 'Disallowed').sum())
        
        # Calculate credit statistics
        credit_col = next((col for col in data.columns if col.startswith('Credited Amount')), None)
        if credit_col:
            total_credits = float(data[credit_col].sum())
            avg_credit = float(data[credit_col].mean())
            max_credit = float(data[credit_col].max())
        else:
            total_credits = avg_credit = max_credit = 0
        
        # Calculate TAT statistics
        tat_col = next((col for col in data.columns if col.startswith('TAT')), None)
        if tat_col:
            tat_values = data[tat_col].replace([np.inf, -np.inf], np.nan).dropna()
            min_tat = float(tat_values.min()) if not tat_values.empty else 0
            max_tat = float(tat_values.max()) if not tat_values.empty else 0
            avg_tat = float(tat_values.mean()) if not tat_values.empty else 0
        else:
            min_tat = max_tat = avg_tat = 0
        
        # Calculate rates
        success_rate = (approved_claims / total_claims * 100) if total_claims > 0 else 0
        approval_rate = (approved_claims / total_claims * 100) if total_claims > 0 else 0
        rejection_rate = (disallowed_claims / total_claims * 100) if total_claims > 0 else 0
        
        return {
            'total_records': total_claims,
            'total_claims': total_claims,
            'approved_claims': approved_claims,
            'disallowed_claims': disallowed_claims,
            'total_credits': total_credits,
            'avg_credit': round(avg_credit, 2),
            'max_credit': round(max_credit, 2),
            'min_tat': round(min_tat, 2),
            'max_tat': round(max_tat, 2),
            'avg_tat': round(avg_tat, 2),
            'success_rate': round(success_rate, 2),
            'approval_rate': round(approval_rate, 2),
            'rejection_rate': round(rejection_rate, 2)
        }
    except Exception as e:
        print(f"Error in get_summary_stats: {str(e)}")
        return {
            'total_records': 0,
            'total_claims': 0,
            'approved_claims': 0,
            'disallowed_claims': 0,
            'total_credits': 0,
            'avg_credit': 0,
            'max_credit': 0,
            'min_tat': 0,
            'max_tat': 0,
            'avg_tat': 0,
            'success_rate': 0,
            'approval_rate': 0,
            'rejection_rate': 0
        }

def process_data_chunk(data_chunk: pd.DataFrame) -> List[Dict[str, Any]]:
    """Process a chunk of data efficiently"""
    try:
        records = data_chunk.to_dict(orient='records')
        processed_records = []
        
        numeric_columns = ['Credited Amount', 'Requested Credits', 'TAT']
        date_columns = ['Claim Submitted Date', 'Claim Close Date']
        
        for record in records:
            try:
                processed_record = {}
                
                # Process numeric fields
                for key in numeric_columns:
                    if key in record:
                        value = record[key]
                        if isinstance(value, (pd.Timestamp, datetime)):
                            # Convert datetime to days since epoch
                            processed_record[key] = float((value - pd.Timestamp('1970-01-01')).total_seconds() / (24 * 3600))
                        else:
                            processed_record[key] = float(value) if pd.notna(value) else 0
                    else:
                        processed_record[key] = 0
                
                # Process date fields
                for key in date_columns:
                    if key in record:
                        value = record[key]
                        if isinstance(value, (pd.Timestamp, datetime)):
                            processed_record[key] = value.strftime('%Y-%m-%d') if pd.notna(value) else None
                        else:
                            processed_record[key] = value if pd.notna(value) else None
                    else:
                        processed_record[key] = None
                
                # Copy other fields
                for key, value in record.items():
                    if key not in processed_record:
                        if isinstance(value, (pd.Timestamp, datetime)):
                            processed_record[key] = value.strftime('%Y-%m-%d') if pd.notna(value) else None
                        else:
                            processed_record[key] = None if pd.isna(value) else value
                
                processed_records.append(processed_record)
            except Exception as e:
                print(f"Error processing record: {str(e)}")
                continue
        
        return processed_records
    except Exception as e:
        print(f"Error in process_data_chunk: {str(e)}")
        return []

@app.route('/')
def index():
    """Render the main dashboard"""
    try:
        summary = get_summary_stats()
        data = load_data()
        
        if data is None or data.empty:
            return render_template('index.html', 
                                 claims_data=json.dumps([]),
                                 summary=json.dumps(summary))
        
        initial_data = data.iloc[:CHUNK_SIZE]
        processed_data = process_data_chunk(initial_data)
        
        return render_template('index.html', 
                             claims_data=json.dumps(processed_data),
                             summary=json.dumps(summary))
    except Exception as e:
        print(f"Error in index route: {str(e)}")
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
        if data is None or data.empty:
            return jsonify({
                'data': [],
                'total': 0,
                'page': page,
                'per_page': per_page,
                'total_pages': 0
            })
        
        total_records = len(data)
        total_pages = (total_records + per_page - 1) // per_page
        
        start_idx = (page - 1) * per_page
        end_idx = min(start_idx + per_page, total_records)
        page_data = data.iloc[start_idx:end_idx]
        
        processed_data = process_data_chunk(page_data)
        
        return jsonify({
            'data': processed_data,
            'total': total_records,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages
        })
    except Exception as e:
        print(f"Error in get_data route: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
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
        print(f"Error in get_summary route: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'total_records': 0,
            'total_claims': 0,
            'approved_claims': 0,
            'disallowed_claims': 0,
            'total_credits': 0,
            'avg_tat': 0
        })

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0') 