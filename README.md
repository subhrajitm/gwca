# Warranty Claims Analytics Dashboard

A Flask-based web application for analyzing warranty claims data with interactive visualizations.

## Features

- Interactive dashboard with multiple charts
- Claims data visualization
- Performance metrics
- Responsive design
- Real-time data updates

## Setup

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python app.py
```

4. Open your browser and navigate to:
```
http://localhost:5000
```

## Project Structure

```
├── app.py              # Flask application
├── requirements.txt    # Python dependencies
├── static/            # Static files
│   ├── css/          # CSS files
│   ├── js/           # JavaScript files
│   ├── images/       # Image assets
│   └── data/         # Data files
└── templates/         # HTML templates
    └── index.html    # Main dashboard
```

## Data

The application uses JSON data stored in `static/data/data.json`. The data structure should remain unchanged for the application to work correctly.

## Development

- The application runs in debug mode by default
- Changes to Python files will trigger automatic reload
- Static files are served from the `static` directory
- Templates are served from the `templates` directory 