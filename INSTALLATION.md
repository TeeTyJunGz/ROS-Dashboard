# Complete Installation Guide - ROS2 Dashboard

## Step-by-Step Installation (Windows)

### Prerequisites Checklist

- [ ] Windows 10/11
- [ ] Administrator access (for some installations)
- [ ] Internet connection

---

## Part 1: Install Node.js (Required)

### Step 1.1: Download Node.js
1. Go to: https://nodejs.org/
2. Download the **LTS version** (recommended: v18 or higher)
3. Choose the Windows Installer (.msi) for your system (64-bit recommended)

### Step 1.2: Install Node.js
1. Run the downloaded `.msi` file
2. Follow the installation wizard:
   - Click "Next" through the setup
   - Accept the license agreement
   - Keep default installation path
   - **Important**: Check "Automatically install the necessary tools" if prompted
3. Click "Install" and wait for completion
4. Click "Finish"

### Step 1.3: Verify Installation
Open **PowerShell** (press `Win + X`, then select "Windows PowerShell" or "Terminal"):

```powershell
node --version
npm --version
```

You should see version numbers (e.g., `v18.17.0` and `9.6.7`)

**If you see errors:**
- Restart your computer
- Or add Node.js to PATH manually (usually `C:\Program Files\nodejs\`)

---

## Part 2: Install Project Dependencies

### Step 2.1: Navigate to Project Directory
Open PowerShell and run:

```powershell
cd C:\Users\STUDENT\Documents\GitHub\ROS-Dashboard-1
```

### Step 2.2: Install Dependencies
```powershell
npm install
```

**This will take 2-5 minutes** - it downloads all required packages.

**Expected output:**
```
added 500+ packages, and audited 500+ packages in 2m
```

**If you encounter errors:**
- **"npm is not recognized"**: Node.js installation failed, reinstall Node.js
- **"EACCES" or permission errors**: Run PowerShell as Administrator
- **Network errors**: Check your internet connection, try again

---

## Part 3: Start the Dashboard (MVP Mode)

### Step 3.1: Start Development Server
```powershell
npm run dev
```

**Expected output:**
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### Step 3.2: Open Dashboard
The dashboard should open automatically in your browser. If not:
1. Open your web browser
2. Go to: `http://localhost:3000`

### Step 3.3: Test the Dashboard
1. Click on any widget in the left panel (e.g., "Button", "Chart")
2. The widget should appear on the dashboard
3. Try dragging it by clicking and holding the widget header
4. Try resizing by dragging the bottom-right corner

**Congratulations! Your dashboard is running in MVP mode!**

---

## Part 4: Connect to ROS2 (Optional - For Production)

### Step 4.1: Install Python (if not already installed)
1. Download from: https://www.python.org/downloads/
2. During installation, **check "Add Python to PATH"**
3. Verify: `python --version`

### Step 4.2: Install Foxglove Bridge
```powershell
pip install foxglove-bridge
```

**If `pip` is not recognized:**
- Use `python -m pip install foxglove-bridge`
- Or install Python properly with PATH enabled

### Step 4.3: Install ROS2 (if not already installed)
For Windows, ROS2 installation is complex. Options:

**Option A: Use WSL2 (Recommended for Windows)**
1. Install WSL2: https://docs.microsoft.com/en-us/windows/wsl/install
2. Install ROS2 in WSL2: https://docs.ros.org/en/humble/Installation/Ubuntu-Install-Debians.html

**Option B: Use ROS2 Native Windows**
- Follow: https://docs.ros.org/en/humble/Installation/Windows-Install-Binary.html

**Option C: Use Docker**
- Run ROS2 in a Docker container

### Step 4.4: Start Foxglove Bridge
Open a **new PowerShell window**:

```powershell
foxglove-bridge
```

**Expected output:**
```
[INFO] Starting Foxglove Bridge server on ws://localhost:8765
```

### Step 4.5: Start ROS2 Nodes
In another terminal, start your ROS2 nodes:

```powershell
# Example with demo nodes
ros2 run demo_nodes_cpp talker
```

### Step 4.6: Connect Dashboard to ROS2
1. Your dashboard should already be running (from Step 3)
2. Check the top-right corner - it should show "Connected" (green)
3. Add widgets and configure them with ROS2 topic names
4. You should see real data flowing!

---

## Troubleshooting

### Dashboard Won't Start

**Problem**: `npm run dev` fails
- **Solution**: Make sure you're in the correct directory
- **Solution**: Delete `node_modules` folder and run `npm install` again

**Problem**: Port 3000 already in use
- **Solution**: Kill the process using port 3000, or change port in `vite.config.js`

### Can't Connect to ROS2

**Problem**: Connection status shows "Disconnected"
- **Solution**: Make sure Foxglove Bridge is running
- **Solution**: Check WebSocket URL (default: `ws://localhost:8765`)
- **Solution**: Check Windows Firewall settings

**Problem**: Widgets show no data
- **Solution**: Verify ROS2 topics are publishing: `ros2 topic list`
- **Solution**: Check topic names match exactly (case-sensitive)
- **Solution**: Verify message types are correct

### Node.js Issues

**Problem**: `node` command not found
- **Solution**: Restart your computer after installing Node.js
- **Solution**: Manually add Node.js to PATH:
  1. Search "Environment Variables" in Windows
  2. Edit "Path" variable
  3. Add: `C:\Program Files\nodejs\`

### npm Issues

**Problem**: `npm install` fails with network errors
- **Solution**: Check internet connection
- **Solution**: Try: `npm install --registry https://registry.npmjs.org/`
- **Solution**: Clear npm cache: `npm cache clean --force`

---

## Quick Commands Reference

```powershell
# Navigate to project
cd C:\Users\STUDENT\Documents\GitHub\ROS-Dashboard-1

# Install dependencies
npm install

# Start dashboard (MVP mode)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Next Steps

1. ✅ Dashboard is running in MVP mode
2. 📖 Read [QUICKSTART.md](QUICKSTART.md) for usage guide
3. 📚 Read [README.md](README.md) for detailed documentation
4. 🔌 Connect to ROS2 when ready (Part 4)
5. 🎨 Customize widgets for your needs

---

## Support

If you encounter issues not covered here:
1. Check the browser console (F12) for errors
2. Check PowerShell/terminal output for errors
3. Review the troubleshooting section above
4. Check ROS2 and Foxglove Bridge documentation

**Happy Dashboard Building! 🚀**

