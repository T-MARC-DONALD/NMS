# Getting Started with NMS

## 🚀 Quick Start (Windows)

### Step 1: Verify Setup
```bash
verify-setup.bat
```

### Step 2: Start Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Wait for: `* Running on http://0.0.0.0:5000`

### Step 3: Start Frontend (New Terminal)
```bash
cd frontend
npm install
npm run dev
```

### Step 4: Open Dashboard
Go to: **http://localhost:3000**

## 🚀 Quick Start (Linux/Mac)

### Step 1: Verify Setup
```bash
bash verify-setup.sh
chmod +x verify-setup.sh
./verify-setup.sh
```

### Step 2: Start Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

### Step 3: Start Frontend (New Terminal)
```bash
cd frontend
npm install
npm run dev
```

### Step 4: Open Dashboard
Go to: **http://localhost:3000**

## 🐳 Docker Setup

### Prerequisites
- Docker & Docker Compose installed

### Start Everything
```bash
docker-compose up
```

### Access
- Dashboard: http://localhost:3000
- API: http://localhost:5000/api

## ✅ First Time Use

1. **Check Dashboard** - Visit http://localhost:3000
   - Should show 0 devices initially
   - Health check shows "Connected"

2. **Add a Device** - Go to "Devices" tab
   - IP Address: `192.168.1.1` (or any device in your network)
   - Type: `Router`
   - Community: `public`
   - Port: `161`

3. **Monitor Activity** - Backend will automatically poll device every 60 seconds

4. **View Events** - Check "Events" tab for any network events

5. **Auto-Discover** - Use "Discovery" tab to scan networks

## 🔧 Configuration

### Backend Configuration (backend/config.py)
```python
SNMP_COMMUNITY_RO = 'public'      # Read-only community
POLLING_INTERVAL = 60             # Seconds between polls
DATA_RETENTION_DAYS = 30          # Keep events for 30 days
```

### Frontend Configuration (vite.config.js)
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:5000'
  }
}
```

## 📊 Features to Try

| Feature | Path | What It Does |
|---------|------|-------------|
| Dashboard | / | Real-time network health overview |
| Devices | /devices | Add, view, manage network devices |
| Events | /events | Track and resolve network events |
| Discovery | /discovery | Scan networks for new devices |
| Billing | /billing | Track traffic and costs |

## 🆘 Troubleshooting

### Backend won't start
**Error**: `Address already in use`
- Solution: Change port in `config.py` or kill process using port 5000
```bash
# Find process using port 5000
netstat -tulpn | grep 5000
# Kill it
kill -9 <PID>
```

### Frontend won't connect
**Error**: `Cannot connect to backend`
- Solution: Ensure backend is running on port 5000
```bash
# Check if backend is running
curl http://localhost:5000/api/health
```

### SNMP queries failing
**Issue**: Device shows "down" even though it's up
- Verify SNMP community string matches device
- Check device is reachable: `ping 192.168.1.1`
- Verify SNMP is enabled on device
- Try different community string (often just try `private`)

### Database issues
**Issue**: Getting database locked error
- Solution: Delete `backend/nms.db` and restart
```bash
rm backend/nms.db  # or del backend/nms.db on Windows
python app.py
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| README.md | Full documentation & API reference |
| QUICKSTART.md | 30-second setup |
| PROJECT_SUMMARY.md | Complete project overview |
| docs/ARCHITECTURE.md | Technical architecture |
| backend/.instructions.md | Backend development notes |
| frontend/.instructions.md | Frontend development notes |

## 🔌 API Testing

### Test Backend Connection
```bash
curl http://localhost:5000/api/health
```

### Get All Devices
```bash
curl http://localhost:5000/api/devices
```

### Add a Device
```bash
curl -X POST http://localhost:5000/api/devices \
  -H "Content-Type: application/json" \
  -d '{"ip_address":"192.168.1.1","device_type":"router","hostname":"Router1"}'
```

### Get Events
```bash
curl http://localhost:5000/api/events
```

## 🧹 Cleanup

### Stop Services
- Backend: `Ctrl+C` in backend terminal
- Frontend: `Ctrl+C` in frontend terminal

### Clear Database
```bash
rm backend/nms.db  # Deletes all stored data
```

### Remove Python Virtual Environment
```bash
rmdir /s backend\venv  # Windows
rm -rf backend/venv    # Mac/Linux
```

### Remove Node Modules
```bash
rmdir /s frontend\node_modules  # Windows
rm -rf frontend/node_modules    # Mac/Linux
```

## 📝 Example Network Setup (GNS3)

For testing with GNS3:

1. **Create Routers**: ISR1331 (Router 0) + ISR1 (Router 1)
2. **Configure SNMP**:
   ```
   snmp-server community public RO
   snmp-server community private RW
   snmp-server host 192.168.30.100 version 2c public
   ```
3. **Add Router IP to NMS**: 192.168.X.X
4. **Wait 60 seconds** for polling to complete
5. **Check Events tab** for device status update

## 📞 Support

For issues:
1. Check troubleshooting section above
2. Review logs in terminal output
3. Check backend/nms.db is not corrupted
4. Try fresh install (delete venv & node_modules)
5. Reference main README.md for detailed docs

## 🎓 Next Steps

After getting comfortable with NMS:
- [ ] Study backend API code
- [ ] Learn React component structure
- [ ] Add custom SNMP OIDs
- [ ] Implement authentication
- [ ] Deploy to production
- [ ] Set up alerts
- [ ] Create custom reports

---

**Happy Monitoring!** 🎯
