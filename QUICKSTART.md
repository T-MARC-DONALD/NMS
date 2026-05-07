# Quick Start Guide

## 30-Second Setup

### Terminal 1 - Backend
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\Activate.ps1
# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python app.py
```

### Terminal 2 - Frontend
```bash
cd frontend
npm install
npm run dev
```

### Access the Application
- **Dashboard**: http://localhost:3000
- **API**: http://localhost:5000/api

## First Steps

1. **Add Devices**: Go to Devices page and add your first network device
2. **Configure SNMP**: Set appropriate SNMP community strings
3. **Start Monitoring**: Watch real-time data on Dashboard
4. **Discover Network**: Use Auto-Discovery to find other devices
5. **Review Events**: Check logged events and resolve issues

## Example Device Add

**IP Address**: 192.168.1.1  
**Type**: Router  
**Community**: public  
**Port**: 161

---

See README.md for detailed documentation.
