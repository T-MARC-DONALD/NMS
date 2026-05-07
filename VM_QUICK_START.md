# VM DEPLOYMENT - QUICK REFERENCE

Choose your VM type and follow the exact steps.

---

## 🪟 WINDOWS VM (10 Minutes)

### Step 1: Install Prerequisites
```powershell
# Install Python
choco install python nodejs  # or download manually

# Verify
python --version
node --version
```

### Step 2: Copy Project to VM
```powershell
# Copy NMS folder to VM (via network share, USB, or file transfer)
# Target: C:\NMS\
```

### Step 3: Terminal 1 - Start Backend
```powershell
cd C:\NMS\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

**Wait for:**
```
 * Running on http://0.0.0.0:5000
 * Scheduler started
```

### Step 4: Terminal 2 - Start Frontend
```powershell
cd C:\NMS\frontend
npm install
npm run dev
```

**Wait for:**
```
VITE v5.0.0  ready in XXX ms
➜  Local:   http://localhost:3000/
```

### Step 5: Open Dashboard
```
Browser: http://localhost:3000
         or
         http://VM-IP:3000
```

### Step 6: Allow Through Firewall
```powershell
netsh advfirewall firewall add rule name="NMS" dir=in action=allow protocol=tcp localport=3000,5000,161
```

---

## 🐧 LINUX VM (Ubuntu/Debian) - 10 Minutes

### Step 1: Install Prerequisites
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv nodejs npm -y
python3 --version
node --version
```

### Step 2: Copy Project to VM
```bash
# Copy NMS folder via SCP, Git, or file transfer
# Target: ~/NMS/
cd ~/NMS
```

### Step 3: Terminal 1 - Start Backend
```bash
cd ~/NMS/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

**Wait for:**
```
 * Running on http://0.0.0.0:5000
 * Scheduler started
```

### Step 4: Terminal 2 - Start Frontend
```bash
cd ~/NMS/frontend
npm install
npm run dev
```

**Wait for:**
```
VITE v5.0.0  ready in XXX ms
➜  Local:   http://localhost:3000/
```

### Step 5: Open Dashboard
```
Browser: http://localhost:3000
         or
         http://VM-IP:3000
```

### Step 6: Allow Through Firewall
```bash
sudo ufw allow 3000/tcp 5000/tcp 161/tcp 161/udp
```

---

## 🐳 DOCKER OPTION (Fastest - 5 Minutes)

### Prerequisites
- Docker & Docker Compose installed on VM

### One Command
```bash
cd ~/NMS  # or C:\NMS
docker-compose up
```

### Access
```
Dashboard: http://localhost:3000
API: http://localhost:5000/api
```

### Stop
```bash
docker-compose down
```

---

## 🌐 ACCESS FROM HOST MACHINE

### Get VM IP
**Windows VM:**
```powershell
ipconfig
# Look for: IPv4 Address (e.g., 192.168.1.100)
```

**Linux VM:**
```bash
ip addr show
# Look for: inet 192.168.1.100
```

### Access from Host
```
Dashboard: http://192.168.1.100:3000
API: http://192.168.1.100:5000/api
```

---

## ✅ VERIFICATION CHECKLIST

After starting, verify each service:

### Backend Health Check
```bash
# From any machine with curl
curl http://VM-IP:5000/api/health

# Should show:
{"success":true,"status":"healthy","timestamp":"..."}
```

### Frontend Access
```
Open browser: http://VM-IP:3000
Should see: Dashboard with 0 devices
```

### Test with Device
```
1. Go to Devices tab
2. Add IP: 192.168.1.1 (your router)
3. Type: Router
4. Community: public
5. Wait 60 seconds
6. Check Dashboard - should show status
```

---

## 🆘 IF SOMETHING FAILS

### Backend won't start
```
Error: "Address already in use"
→ Kill process: netstat -ano | findstr :5000
→ Then taskkill /PID XXX /F

Error: "No module named 'flask'"
→ Ensure venv is activated
→ Run: pip install -r requirements.txt again
```

### Frontend won't load
```
Error: "npm ERR! ERESOLVE"
→ Run: npm cache clean --force
→ Then: npm install --legacy-peer-deps

Error: "ENOENT: no such file or directory"
→ Make sure you're in frontend folder
→ Run: npm install
```

### Can't reach from host
```
1. Ping VM: ping VM-IP
   If fails → network issue
   
2. Check ports open: netstat -an | grep 3000
   If fails → service not running
   
3. Check firewall
```

---

## 📝 MINIMAL SETUP FOR TESTING

If you just want to test quickly:

### 1. Backend Only (Command Line)
```bash
cd backend
python -m venv venv
# Activate venv...
pip install -r requirements.txt
python app.py
```

### 2. Test API with curl
```bash
# In another terminal
curl http://localhost:5000/api/health
curl http://localhost:5000/api/devices
```

### 3. Add Frontend Later
```bash
cd frontend
npm install
npm run dev
```

---

## 🎯 RECOMMENDED SETUP

**Best Practice for Production:**

1. ✅ Dedicated VM (not shared)
2. ✅ 2+ GB RAM, 10+ GB disk
3. ✅ Ubuntu 20.04 LTS or Windows Server 2019+
4. ✅ Docker Compose deployment
5. ✅ Systemd services (Linux) or Scheduled Tasks (Windows)
6. ✅ Database backups enabled
7. ✅ Firewall rules configured
8. ✅ Monitoring enabled

See **DEPLOY_TO_VM.md** for detailed setup.

---

## 📊 ARCHITECTURE WITH VM

```
Your Laptop                    Virtual Machine              GNS3 Network
=========================================================================
┌─────────────┐               ┌──────────────┐             ┌──────────┐
│  Browser    │──HTTP──→      │   Frontend   │             │  Router  │
│ :3000       │               │   (React)    │             │ 192.1.1  │
└─────────────┘               └──────────────┘             └──────────┘
                                     │
                                HTTP Proxy
                                     │
                              ┌──────────────┐             ┌──────────┐
                              │   Backend    │──SNMP──→    │  Switch  │
curl API ──────────────→      │   (Flask)    │             │ 192.1.2  │
                              │   :5000      │             └──────────┘
                              └──────────────┘

                              Database (SQLite)
                              Event Storage
                              Device Polling
```

---

## 🎓 NEXT STEPS

1. ✅ Follow steps above for your OS
2. ✅ Verify services running
3. ✅ Add first device via UI
4. ✅ Monitor events in real-time
5. ✅ Check [DEPLOY_TO_VM.md](DEPLOY_TO_VM.md) for advanced setup
6. ✅ Read [README.md](README.md) for full docs

---

**Choose your OS above and follow the steps!**
