"""Network Management System Backend"""
import os
import logging
from flask import Flask
from flask_cors import CORS
import threading
import time
from models import db
from config import config
from datetime import datetime
from models import NetworkDevice, NetworkEvent, NetworkInterface
from sqlalchemy import desc

# Try to import SNMP collector, but make it optional for Python 3.14 compatibility
try:
    from snmp_collector import SNMPCollector
    SNMP_AVAILABLE = True
except ImportError as e:
    logger_temp = logging.getLogger(__name__)
    msg = str(e)
    logger_temp = logging.getLogger(__name__)
    if 'pyasn1' in msg or 'pysn1' in msg:
        logger_temp.warning(
            f"SNMP collector not available: {e}. "
            "Install required SNMP dependencies (e.g. run: pip install -r backend/requirements.txt). "
            "Running without SNMP support."
        )
    else:
        logger_temp.warning(f"SNMP collector not available: {e}. Running without SNMP support.")
    SNMP_AVAILABLE = False
    SNMPCollector = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app(config_name='development'):
    """Create Flask application"""
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    CORS(app)
    
    # Start a simple background polling thread (avoids external scheduler dependency)
    def _polling_loop():
        # Delay slightly before first run
        time.sleep(1)
        while True:
            try:
                poll_all_devices(app)
            except Exception as e:
                logger.error(f"Polling loop error: {e}")
            time.sleep(app.config.get('POLLING_INTERVAL', 60))

    with app.app_context():
        # Create tables
        db.create_all()

        # Start polling thread
        polling_thread = threading.Thread(target=_polling_loop, daemon=True, name='NMS-Poller')
        polling_thread.start()
    
    # Import and register blueprints
    from api import api_bp
    app.register_blueprint(api_bp)
    
    @app.shell_context_processor
    def make_shell_context():
        return {
            'db': db,
            'NetworkDevice': NetworkDevice,
            'NetworkEvent': NetworkEvent,
            'NetworkInterface': NetworkInterface
        }
    
    return app

def poll_all_devices(app):
    """Poll all enabled devices"""
    if not SNMP_AVAILABLE:
        return  # Skip polling if SNMP is not available
    
    with app.app_context():
        logger.info("Starting device polling cycle")
        collector = SNMPCollector()
        devices = NetworkDevice.query.filter_by(enabled=True).all()
        
        for device in devices:
            try:
                collector.poll_device(device)
            except Exception as e:
                logger.error(f"Error polling device {device.ip_address}: {str(e)}")
        
        logger.info(f"Device polling cycle complete. Polled {len(devices)} devices")

# Create application instance
app = create_app(os.getenv('FLASK_ENV', 'development'))

if __name__ == '__main__':
    app.run(debug=False, host='127.0.0.1', port=5000)
