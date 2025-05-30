from flask import Flask, render_template, jsonify, request
import pandas as pd
import os
import logging
import json
from datetime import datetime
from json import JSONEncoder
from functools import lru_cache
import numpy as np
from concurrent.futures import ThreadPoolExecutor
import time
from typing import Dict, List, Any, Optional
import threading

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global variables
df = None
CHUNK_SIZE = 1000
CACHE_SIZE = 128
MAX_WORKERS = 4
loading_status = {
    'is_loading': False,
    'progress': 0,
    'status': '',
    'error': None
}
loading_lock = threading.Lock()

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

def update_loading_status(progress: float, status: str, error: Optional[str] = None):
    """Update the loading status with thread safety"""
    with loading_lock:
        loading_status['progress'] = progress
        loading_status['status'] = status
        loading_status['error'] = error

def load_data_in_background():
    """Load data in background thread with progress tracking"""
    global df
    try:
        update_loading_status(0, "Starting data load...")
        
        current_dir = os.path.dirname(os.path.abspath(__file__))
        excel_path = os.path.join(current_dir, 'data', 'claims_data.xlsx')
        
        if not os.path.exists(excel_path):
            update_loading_status(0, "Error", f"Excel file not found at: {excel_path}")
            return
        
        update_loading_status(30, "Reading Excel file...")
        
        # Column mapping
        column_mapping = {
            'Credit to Customer': 'Credited Amount',
            'Claim Status': 'Claim Status',
            'Product Line': 'Product Line',
            'Warranty Type-Final': 'Warranty Type',
            'Claim Submitted Date': 'Claim Submitted Date',
            'Claim Close Date': 'Claim Close Date',
            'TAT': 'TAT',
            'Requested Credits': 'Requested Credits'
        }
        
        # Read with optimizations
        df = pd.read_excel(
            excel_path,
            dtype={
                'Claim Status': 'category',
                'Product Line': 'category',
                'Warranty Type-Final': 'category',
                'Requested Credits': 'float32'
            }
        )
        
        update_loading_status(60, "Processing data...")
        
        # Rename columns
        df = df.rename(columns=column_mapping)
        
        # Clean and convert Credit to Customer column
        if 'Credit to Customer' in df.columns:
            df['Credit to Customer'] = df['Credit to Customer'].apply(
                lambda x: float(str(x).replace('$', '').replace(',', '')) 
                if pd.notna(x) and str(x).replace('$', '').replace(',', '').replace('.', '').isdigit() 
                else 0.0
            )
            df = df.rename(columns={'Credit to Customer': 'Credited Amount'})
        
        # Process date columns
        date_columns = ['Claim Submitted Date', 'Claim Close Date']
        for col in date_columns:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors='coerce').dt.strftime('%Y-%m-%d')
        
        # Convert TAT to float
        if 'TAT' in df.columns:
            df['TAT'] = df['TAT'].apply(
                lambda x: float(x) if pd.notna(x) and not isinstance(x, (pd.Timestamp, datetime)) else 0.0
            )
        
        # Optimize memory usage
        for col in df.select_dtypes(include=['object']).columns:
            if col not in date_columns:
                df[col] = df[col].astype('category')
        
        update_loading_status(80, "Finalizing...")
        
        # Additional optimizations
        df = df.replace([np.inf, -np.inf], np.nan)
        df = df.fillna({
            'Credited Amount': 0,
            'Requested Credits': 0,
            'TAT': 0
        })
        
        # Ensure all required columns exist
        required_columns = [
            'Credited Amount', 'Claim Status', 'Product Line', 
            'Warranty Type', 'Claim Submitted Date', 'Claim Close Date', 
            'TAT', 'Requested Credits'
        ]
        
        for col in required_columns:
            if col not in df.columns:
                if col in ['Credited Amount', 'Requested Credits', 'TAT']:
                    df[col] = 0
                elif col in date_columns:
                    df[col] = pd.NaT
                else:
                    df[col] = None
        
        update_loading_status(100, "Data loading complete!")
        
    except Exception as e:
        error_msg = f"Error loading data: {str(e)}"
        logger.error(error_msg, exc_info=True)
        update_loading_status(0, "Error", error_msg)

def load_data():
    """Load data with background processing"""
    global df, loading_status
    
    if df is not None:
        return df
    
    with loading_lock:
        if loading_status['is_loading']:
            return None
        
        loading_status['is_loading'] = True
        loading_status['progress'] = 0
        loading_status['status'] = "Starting data load..."
        loading_status['error'] = None
    
    # Start background loading
    with ThreadPoolExecutor(max_workers=1) as executor:
        executor.submit(load_data_in_background)
    
    return None

@lru_cache(maxsize=CACHE_SIZE)
def get_summary_stats():
    """Get cached summary statistics with error handling"""
    try:
        data = load_data()
        if data is None or data.empty:
            return {
                'total_records': 0,
                'total_claims': 0,
                'approved_claims': 0,
                'disallowed_claims': 0,
                'total_credits': 0,
                'avg_tat': 0,
                'success_rate': 0,
                'approval_rate': 0,
                'rejection_rate': 0
            }
        
        # Use vectorized operations for better performance
        approved_mask = data['Claim Status'] == 'Approved'
        disallowed_mask = data['Claim Status'] == 'Disallowed'
        
        total_claims = len(data)
        approved_claims = int(approved_mask.sum())
        disallowed_claims = int(disallowed_mask.sum())
        
        # Calculate rates
        success_rate = (approved_claims / total_claims * 100) if total_claims > 0 else 0
        approval_rate = (approved_claims / total_claims * 100) if total_claims > 0 else 0
        rejection_rate = (disallowed_claims / total_claims * 100) if total_claims > 0 else 0
        
        return {
            'total_records': total_claims,
            'total_claims': total_claims,
            'approved_claims': approved_claims,
            'disallowed_claims': disallowed_claims,
            'total_credits': float(data['Credited Amount'].sum()),
            'avg_tat': float(data['TAT'].mean()),
            'success_rate': round(success_rate, 2),
            'approval_rate': round(approval_rate, 2),
            'rejection_rate': round(rejection_rate, 2)
        }
    except Exception as e:
        logger.error(f"Error calculating summary stats: {str(e)}", exc_info=True)
        return {
            'total_records': 0,
            'total_claims': 0,
            'approved_claims': 0,
            'disallowed_claims': 0,
            'total_credits': 0,
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
        
        for record in records:
            try:
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
                date_columns = ['Claim Submitted Date', 'Claim Close Date']
                for key in date_columns:
                    if key in record:
                        processed_record[key] = record[key] if pd.notna(record[key]) else None
                    else:
                        processed_record[key] = None
                
                # Copy other fields
                for key, value in record.items():
                    if key not in processed_record:
                        processed_record[key] = None if pd.isna(value) else value
                
                processed_records.append(processed_record)
            except Exception as e:
                logger.error(f"Error processing record: {str(e)}")
                continue
        
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
        
        # Load data if not already loaded
        data = load_data()
        if data is None:
            return render_template('index.html', 
                                 claims_data=json.dumps([]),
                                 summary=json.dumps(summary),
                                 loading_status=json.dumps(loading_status))
        
        if data.empty:
            return render_template('index.html', 
                                 claims_data=json.dumps([]),
                                 summary=json.dumps(summary))
        
        # Process only the first chunk
        initial_data = data.iloc[:CHUNK_SIZE]
        processed_data = process_data_chunk(initial_data)
        
        return render_template('index.html', 
                             claims_data=json.dumps(processed_data),
                             summary=json.dumps(summary),
                             loading_status=json.dumps(loading_status))
    except Exception as e:
        logger.error(f"Error in index route: {str(e)}", exc_info=True)
        return render_template('index.html', 
                             claims_data=json.dumps([]),
                             summary=json.dumps(get_summary_stats()),
                             loading_status=json.dumps(loading_status))

@app.route('/api/data')
def get_data():
    """API endpoint to get paginated claim data"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', CHUNK_SIZE))
        
        data = load_data()
        if data is None:
            logger.warning("No data available from load_data()")
            return jsonify({
                'data': [],
                'total': 0,
                'page': page,
                'per_page': per_page,
                'total_pages': 0,
                'loading_status': loading_status
            })
        
        if data.empty:
            logger.warning("DataFrame is empty")
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
        
        logger.info(f"Processing page {page} with {len(page_data)} records")
        logger.info(f"Sample data from page:\n{page_data.head()}")
        
        # Process the data chunk
        processed_data = process_data_chunk(page_data)
        
        logger.info(f"Returning {len(processed_data)} processed records")
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

@app.route('/api/loading-status')
def get_loading_status():
    """API endpoint to get current loading status"""
    return jsonify(loading_status)

if __name__ == '__main__':
    app.run(debug=True, port=5000) 