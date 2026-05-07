# Running NMS on a Virtual Machine

This guide explains how to deploy and run the Network Management System on a Windows or Linux VM.

---

## 🖥️ VM REQUIREMENTS

### Minimum Specs
- **CPU**: 2 cores
- **RAM**: 2-4 GB
- **Disk**: 10 GB free space
- **OS**: Windows Server / Ubuntu / CentOS / Debian

### Recommended Specs (Production)
- **CPU**: 4+ cores
- **RAM**: 4-8 GB
- **Disk**: 20+ GB
- **Network**: Direct connection to GNS3 network

---

## 📋 STEP 1: INSTALL PREREQUISITES ON VM

### For Windows VM

**Python 3.8+**
```powershell
# Download & install from python.org or use:
choco install python  # If using Chocolatey

# Verify
python --version
```

**Node.js & npm**
```powershell
choco install nodejs  # Or download from nodejs.org

# Verify
node --version
npm --version
```

**Git (optional, for cloning)**
```powershell
choco install git
```

### For Linux VM (Ubuntu/Debian)

```bash
# Update package manager
sudo apt update && sudo apt upgrade -y

# Python
sudo apt install python3 python3-pip python3-venv -y

# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Verify
python3 --version
node --version
npm --version
```

### For Linux VM (CentOS/RHEL)

```bash
sudo yum update -y
sudo yum install python3 python3-pip -y
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install nodejs -y
```

---

## 📤 STEP 2: TRANSFER PROJECT TO VM

### Option A: Copy via SMB Share (Easiest)
```powershell
# From Host Machine (Windows)
# Share the NMS folder and copy to VM
Copy-Item C:\Users\LIMITLESS\Desktop\NMS -Destination \\VM-IP\shared\NMS -Recurse
```

### Option B: Copy via Network Drive
```powershell
# On VM, map network drive to host
net use Z: \\HOST-IP\shared

# Copy from mapped drive
Copy-Item Z:\NMS C:\NMS -Recurse
```

### Option C: Git Clone (If using Git)
```bash
git clone https://your-repo-url.git /home/nms/NMS
```

### Option D: SCP (Linux to Linux)
```bash
scp -r /local/NMS user@vm-ip:/home/
```

### Option E: Upload via SFTP
```
Use WinSCP or FileZilla:
- Connect to VM IP
- Transfer NMS folder via SFTP
```

---

## 🚀 STEP 3: RUN ON WINDOWS VM

### Using PowerShell

**Step 1: Start Backend**
```powershell
cd C:\NMS\backend

# Create virtual environment
python -m venv venv

# Activate it
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run backend
python app.py
```

**Expected Output:**
```
 * Running on http://0.0.0.0:5000
 * Scheduler started
```

**Step 2: Start Frontend (New PowerShell Window)**
```powershell
cd C:\NMS\frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Expected Output:**
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

**Step 3: Access Dashboard**
- Open browser on VM or host
- Navigate to: `http://localhost:3000` or `http://VM-IP:3000`

---

## 🐧 STEP 3: RUN ON LINUX VM

### Using Bash

**Step 1: Start Backend**
```bash
cd ~/NMS/backend

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend
python3 app.py

# Or run in background
nohup python3 app.py > backend.log 2>&1 &
```

**Step 2: Start Frontend (SSH Session 2)**
```bash
cd ~/NMS/frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Or run in background with PM2
npm install -g pm2
pm2 start "npm run dev" --name "nms-frontend"
pm2 logs nms-frontend
```

**Step 3: Access Dashboard**
```bash
# From host machine
curl http://VM-IP:3000

# Or open in browser
http://VM-IP:3000
```

---

## 🌐 STEP 4: NETWORK CONFIGURATION

### Access from Host Machine

**Windows VM → Host Windows Machine**
```
1. Get VM IP address:
   ipconfig (on VM)
   
2. Access from host:
   Dashboard: http://VM-IP:3000
   API: http://VM-IP:5000/api
```

**Linux VM → Host Machine**
```bash
# Get IP on VM
ip addr show

# Access from host (replace with actual IP)
http://192.168.1.100:3000
http://192.168.1.100:5000/api
```

### Allow Through Firewall

**Windows VM**
```powershell
# Allow port 3000 (Frontend)
netsh advfirewall firewall add rule name="NMS Frontend" dir=in action=allow protocol=tcp localport=3000

# Allow port 5000 (Backend)
netsh advfirewall firewall add rule name="NMS Backend" dir=in action=allow protocol=tcp localport=5000

# Allow SNMP (port 161)
netsh advfirewall firewall add rule name="SNMP" dir=in action=allow protocol=tcp localport=161
netsh advfirewall firewall add rule name="SNMP-UDP" dir=in action=allow protocol=udp localport=161
```

**Linux VM**
```bash
# Using UFW
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp
sudo ufw allow 161/tcp
sudo ufw allow 161/udp

# Or using iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 5000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 161 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 161 -j ACCEPT
```

---

## 🐳 STEP 5: DOCKER OPTION (If Installed on VM)

### Install Docker on VM

**Windows VM:**
```powershell
# Using Chocolatey
choco install docker-desktop

# Or download from: https://www.docker.com/products/docker-desktop
```

**Linux VM:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Run with Docker Compose

```bash
# Navigate to NMS folder
cd C:\NMS  # or ~/NMS

# Start everything
docker-compose up

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Access:**
- Dashboard: `http://localhost:3000` or `http://VM-IP:3000`
- API: `http://localhost:5000/api` or `http://VM-IP:5000/api`

---

## 🔧 PRODUCTION SETUP (Systemd on Linux)

### Create Backend Service

```bash
sudo nano /etc/systemd/system/nms-backend.service
```

**Content:**
```ini
[Unit]
Description=NMS Backend Service
After=network.target

[Service]
Type=simple
User=nms
WorkingDirectory=/home/nms/NMS/backend
ExecStart=/home/nms/NMS/backend/venv/bin/python app.py
Restart=always
RestartSec=10
Environment="FLASK_ENV=production"

[Install]
WantedBy=multi-user.target
```

**Enable & Start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable nms-backend
sudo systemctl start nms-backend
sudo systemctl status nms-backend
```

### Create Frontend Service

```bash
sudo nano /etc/systemd/system/nms-frontend.service
```

**Content:**
```ini
[Unit]
Description=NMS Frontend Service
After=network.target

[Service]
Type=simple
User=nms
WorkingDirectory=/home/nms/NMS/frontend
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable & Start:**
```bash
sudo systemctl enable nms-frontend
sudo systemctl start nms-frontend
sudo systemctl status nms-frontend
```

### Monitor Services
```bash
# Check status
sudo systemctl status nms-backend
sudo systemctl status nms-frontend

# View logs
sudo journalctl -u nms-backend -f
sudo journalctl -u nms-frontend -f
```

---

## 📊 STEP 6: GNS3 INTEGRATION

### Network Configuration

**In GNS3:**
1. Create VM appliance or connect physical VM
2. Configure network to be on same subnet as routers
3. Example: Router IP = 192.168.1.1, VM IP = 192.168.1.100

**Add Devices to NMS:**
```
IP Address: 192.168.1.1
Type: Router
Community: public
Port: 161
```

### Configure Network Devices for SNMP

**On GNS3 Router (Example):**
```
configure terminal
snmp-server community public RO
snmp-server community private RW
snmp-server enable traps
snmp-server host 192.168.1.100 version 2c public
end
```

### Verify Connectivity

**From NMS VM:**
```bash
# Test SNMP connection to router
snmpwalk -v 2c -c public 192.168.1.1 1.3.6.1.2.1.1.1.0

# Or use nmap to verify port 161
nmap -p 161 192.168.1.1
```

---

## 🆘 TROUBLESHOOTING ON VM

### Backend Won't Start
```
Error: Address already in use
Solution: Find & kill process on port 5000
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux
sudo lsof -i :5000
sudo kill -9 <PID>
```

### Frontend Won't Install
```
Error: npm ERR! ERESOLVE
Solution: Clear npm cache & use legacy peer deps
npm cache clean --force
npm install --legacy-peer-deps
```

### Can't Reach VM from Host
```
1. Check VM is running
2. Verify firewall allows ports 3000 & 5000
3. Check VM IP: ipconfig (Windows) or ip addr (Linux)
4. Test connectivity: ping VM-IP
5. Check if services are listening: netstat -an
```

### SNMP Not Working on VM
```
1. Verify SNMP port 161 is open:
   netstat -an | grep 161 (Linux)
   netstat -ano | findstr :161 (Windows)

2. Test with snmpwalk:
   snmpwalk -v 2c -c public <device-ip> 1.3.6.1.2.1.1

3. Check firewall allows port 161
4. Verify SNMP enabled on network device
```

### Database Issues
```
Delete and recreate database:
rm backend/nms.db  # or del backend\nms.db on Windows
# Restart backend - new database will be created
```

---

## 🔐 SECURITY CONSIDERATIONS FOR VM

### Enable SSH Key Auth (Linux)
```bash
# On VM
ssh-keygen -t rsa -b 4096
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# On host, use key instead of password
ssh -i ~/.ssh/id_rsa user@vm-ip
```

### Use Strong Credentials
```bash
# Change default password on VM
passwd

# If using SSH, disable password auth
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

### Environment Variables (Production)
```bash
# Backend VM setup
export FLASK_ENV=production
export SNMP_COMMUNITY_RO=your-secure-community
export DATABASE_URL=sqlite:///./nms.db
```

### Firewall Rules (Minimal)
```powershell
# Windows - only allow necessary ports
netsh advfirewall firewall set rule name="NMS Frontend" new enable=yes
# Only allow from specific IPs if possible
netsh advfirewall firewall set rule name="NMS Frontend" new remoteip=192.168.1.0/24
```

---

## 📋 CHECKLIST: VM DEPLOYMENT

- [ ] VM created with 2+ GB RAM, 10+ GB disk
- [ ] Python 3.8+ installed
- [ ] Node.js 16+ installed
- [ ] NMS project copied to VM
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Backend started (`python app.py`)
- [ ] Frontend started (`npm run dev`)
- [ ] Dashboard accessible at `http://VM-IP:3000`
- [ ] API healthy at `http://VM-IP:5000/api/health`
- [ ] Firewall rules updated for ports 3000, 5000, 161
- [ ] Network devices added and SNMP reachable
- [ ] Services auto-start on VM reboot (systemd/Windows services)
- [ ] Database location specified for backups
- [ ] Logs monitored and rotated

---

## 🚀 EXAMPLE: COMPLETE SETUP (Linux)

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
sudo apt install python3 python3-pip python3-venv nodejs npm git -y

# 3. Create NMS user
sudo useradd -m -s /bin/bash nms
sudo su - nms

# 4. Clone or copy project
git clone https://your-repo.git NMS
cd NMS

# 5. Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 6. Setup frontend
cd ../frontend
npm install
npm run build  # Build for production

# 7. Start services (using systemd)
sudo systemctl start nms-backend
sudo systemctl start nms-frontend
sudo systemctl enable nms-backend
sudo systemctl enable nms-frontend

# 8. Monitor
sudo journalctl -u nms-backend -f
```

---

## 📞 COMMON VM SCENARIOS

### Scenario 1: Dedicated NMS VM (Recommended)
- Separate VM just for NMS
- Dedicated to monitoring GNS3 network
- Can allocate more resources
- Easier to back up & replicate

### Scenario 2: VM on Same Host as GNS3
- NMS VM on same physical machine as GNS3
- Lower resource overhead
- Faster network latency
- GNS3 must be bridged/NAT'd to reach VM

### Scenario 3: VM on Different Physical Machine
- VM in data center or separate server
- More robust & professional
- Better isolation
- Requires network routing to reach GNS3 devices

### Scenario 4: Docker Container on VM
- Lightweight containerized deployment
- Easy to scale & replicate
- Requires Docker installed
- Simplest multi-instance deployment

---

**Choose the setup that fits your infrastructure!**
