# Flask & SNMP Network Management System Development Notes

## Project Overview
Full-stack network monitoring system for GNS3 simulated networks.
Backend: Flask + PySnmp + SQLAlchemy + APScheduler
Frontend: React + Vite + Tailwind + Chart.js
Database: SQLite

## Architecture Decisions
- **Flask**: Lightweight REST API framework, simple deployment
- **PySnmp**: Pure Python SNMP implementation
- **APScheduler**: Background polling of devices every 60 seconds
- **Vite**: Fast dev server and optimized builds
- **Tailwind**: Utility-first CSS for rapid UI development
- **SQLite**: No external DB dependency, suitable for lab environment

## Data Flow
1. Frontend requests backend API /api endpoints
2. Backend validates requests & updates SQLite database
3. APScheduler polls devices via SNMP every 60 seconds
4. SNMP collector updates device status & creates events
5. Frontend fetches data & displays dashboard/tables
6. Real-time refresh every 30 seconds on dashboard

## Key Technical Decisions
- Event model stores trap/alert data with severity & resolution status
- Device status updated during polling (up/down/unknown)
- Automatic NetworkEvent creation on device state changes
- Interface inventory collected per device during polling
- Billing records calculated from traffic patterns
- CORS enabled to allow frontend on different port
