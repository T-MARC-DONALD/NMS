# Network Management System (NMS)

A comprehensive network monitoring and management application built for GNS3 simulated networks. This system collects SNMP data from network devices, stores it in a database, and provides real-time dashboards for network administrators.

## Features

### Core Functionality
- **Device Management**: Add, monitor, and manage network devices (routers, switches, servers)
- **Real-time Monitoring**: SNMP polling of network devices at configurable intervals
- **Event Management**: Capture, track, and resolve network events and alerts
- **Network Inventory**: View detailed device information including interfaces and configuration
- **Auto-Discovery**: Automatically discover and add new devices to the network
- **Billing & SLA**: Track traffic usage and billing per IP address
- **Responsive Dashboard**: Real-time visualization of network status and health

### Technical Stack

**Backend**
- Python Flask REST API
- SQLAlchemy ORM with SQLite database
- PySnmp for SNMP protocol handling
- APScheduler for periodic polling
- Flask-CORS for cross-origin requests

**Frontend**
- React 18 with Vite
- React Router for navigation
- Axios for API communication
- Chart.js for data visualization
- Tailwind CSS for styling

## Project Structure

```
NMS/
├── backend/
│   ├── app.py              # Flask application entry point
│   ├── config.py           # Configuration settings
│   ├── models.py           # Database models
│   ├── api.py              # REST API endpoints
│   ├── snmp_collector.py   # SNMP data collection logic
│   ├── requirements.txt    # Python dependencies
│   └── .gitignore
├── frontend/
│   ├── src/
│   │   ├── main.jsx        # React entry point
│   │   ├── App.jsx         # Main App component
│   │   ├── api.js          # API client library
│   │   ├── index.css       # Global styles
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── Devices.jsx
│   │       ├── Events.jsx
│   │       ├── Discovery.jsx
│   │       ├── Billing.jsx
│   │       └── DeviceDetail.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .gitignore
└── docs/
    └── README.md           # This file
```

## Prerequisites

- Python 3.8+ (for backend)
- Node.js 16+ (for frontend)
- pip (Python package manager)
- npm or yarn (Node package manager)

## Backend Setup

### 1. Create Python Virtual Environment

On Windows (PowerShell):
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

On Linux/Mac:
```bash
cd backend
python -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Backend Server

```bash
python app.py
```

The backend will start on `http://localhost:5000`. You should see:
```
 * Running on http://0.0.0.0:5000
 * Scheduler started
```

**Note**: The database (`nms.db`) will be created automatically on first run.

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The frontend will start on `http://localhost:3000`.

### 3. Build for Production

```bash
npm run build
```

The optimized build will be in the `dist/` directory.

## Usage Guide

### Dashboard
- View overall network health and statistics
- Monitor uptime percentage and device status
- See recent unresolved events with severity levels
- Real-time charts showing event distribution

### Devices Management
- View all devices in the network
- Add new devices manually with SNMP configuration
- Edit device details (hostname, location, SNMP settings)
- View detailed device information including interfaces
- Delete devices from inventory

### Event Tracking
- View all network events with timestamps
- Filter events by severity (critical, warning, info)
- Filter by resolution status (resolved/unresolved)
- Mark events as resolved
- Automatic event generation for device state changes

### Auto-Discovery
- Scan network ranges (CIDR notation)
- Automatically detect responding devices via SNMP
- Bulk add discovered devices to inventory
- Prevents duplicate device entries

### Billing & SLA
- Track per-IP traffic usage (incoming/outgoing)
- Calculate costs based on configurable rates
- View service level agreements
- Generate billing reports for time periods

## API Documentation

All API endpoints are prefixed with `/api`

### Devices
- `GET /devices` - List all devices (paginated)
- `POST /devices` - Add new device
- `GET /devices/{id}` - Get device details
- `PUT /devices/{id}` - Update device
- `DELETE /devices/{id}` - Delete device

### Events
- `GET /events` - List events (paginated, filterable)
- `PUT /events/{id}/resolve` - Mark event as resolved

### Statistics
- `GET /stats/summary` - Get system statistics
- `GET /stats/events-by-severity` - Event count by severity

### Health
- `GET /health` - Health check endpoint

## Configuration

### Backend (backend/config.py)

Edit the configuration class to customize:

```python
SNMP_VERSION = '2c'              # SNMP version
SNMP_TIMEOUT = 1                 # SNMP timeout in seconds
POLLING_INTERVAL = 60            # Device polling interval in seconds
DATA_RETENTION_DAYS = 30         # Keep events for 30 days
SNMP_COMMUNITY_RO = 'public'     # Read-only community string
SNMP_COMMUNITY_RW = 'private'    # Read-write community string
```

### Device SNMP Settings

When adding a device, configure:
- **IP Address**: Device IP for SNMP queries
- **Hostname**: Display name (auto-discovered if available)
- **SNMP Community**: Community string (usually "public" for read-only)
- **SNMP Port**: SNMP port (default: 161)
- **Device Type**: router, switch, server, firewall, printer, etc.

## SNMP Configuration on Network Devices

To enable SNMP on your GNS3 devices:

```
! Read-only community
snmp-server community public RO

! Read-write community
snmp-server community private RW

! Enable traps
snmp-server enable traps

! Direct traps to NMS server
snmp-server host 192.168.30.100 version 2c public
```

## Database Schema

### NetworkDevice
- id (Primary Key)
- ip_address (Unique, Indexed)
- hostname
- device_type
- location
- snmp_community
- snmp_version
- port
- status (up/down/unknown)
- enabled
- last_seen
- created_at, updated_at

### NetworkEvent
- id (Primary Key)
- device_id (Foreign Key)
- event_type
- severity (critical/warning/info)
- message
- oid (SNMP OID)
- resolved
- resolved_at
- created_at (Indexed)

### NetworkInterface
- id (Primary Key)
- device_id (Foreign Key)
- interface_index
- interface_name
- interface_type
- ip_address
- mac_address
- status (up/down)
- incoming_traffic
- outgoing_traffic
- last_updated

### BillingRecord
- id (Primary Key)
- ip_address (Indexed)
- date (Indexed)
- total_traffic_in, total_traffic_out
- rate_per_gb
- total_cost

## Monitoring Best Practices

1. **Regular Device Discovery**: Run discovery periodically to find new devices
2. **Alert Thresholds**: Monitor critical events and respond quickly
3. **Data Retention**: Old events are automatically cleaned up (configurable)
4. **Backup Database**: Regularly backup the `nms.db` file
5. **Monitor NMS Server**: Ensure the NMS VM has adequate resources

## Troubleshooting

### Backend Connection Failed
- Ensure backend is running on `http://localhost:5000`
- Check firewall settings
- Verify no port conflicts

### SNMP Queries Failing
- Verify device IP address is reachable
- Check SNMP community string matches device configuration
- Verify SNMP is enabled on the device
- Check SNMP port (default: 161)

### Devices Not Communicating
- Ensure routing is configured between network segments
- Check inter-VLAN routing is enabled
- Verify static routes if using multiple routers

### Performance Issues
- Reduce polling interval if many devices
- Increase database retention period cleanup
- Monitor CPU and memory on NMS server

## Extending the System

### Adding New Event Types
Edit `snmp_collector.py` and add new event detection logic

### Custom Dashboard Widgets
Add new components in `frontend/src/components/`

### Database Queries
Use SQLAlchemy ORM in `api.py` for custom queries

### API Endpoints
Add new routes in `backend/api.py`

## Security Considerations

- Use SNMP v3 with authentication in production
- Encrypt SNMP community strings
- Restrict API access with authentication
- Use HTTPS for production deployment
- Regularly update dependencies
- Run NMS with minimal required permissions

## Production Deployment

### Backend
```bash
# Use production config
export FLASK_ENV=production
# Use WSGI server (gunicorn)
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Frontend
```bash
# Build optimized version
npm run build
# Serve with static server
npx serve dist
```

## License

This project is provided as-is for educational purposes.

## Support & Contact

For issues or questions about the tutorial, refer to Tutorial No. 4 documentation.

---

**Version**: 1.0  
**Last Updated**: 2026-05-07  
**Author**: Network Management Tutorial Project
