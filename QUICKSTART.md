# Quick Start Guide

## Installation (5 minutes)

### 1. Install Node.js
- Download from: https://nodejs.org/ (v18 or higher)
- Verify: Open PowerShell and run `node --version`

### 2. Install Dependencies
```bash
cd C:\Users\STUDENT\Documents\GitHub\ROS-Dashboard-1
npm install
```

### 3. Start the Dashboard
```bash
npm run dev
```

The dashboard will open at `http://localhost:3000`

## Using the Dashboard (MVP Mode)

### Add Widgets
1. Click any widget in the left panel (Camera, Lidar, Button, etc.)
2. The widget appears on your dashboard

### Move Widgets
1. Click and hold the widget header (the blue bar at the top)
2. Drag to move

### Resize Widgets
1. Hover over the bottom-right corner of a widget
2. Drag to resize

### Configure Widgets
- Each widget has input fields for configuration
- Enter ROS2 topic names (e.g., `/camera/image_raw`)
- Adjust settings like point size, max lines, etc.

### Remove Widgets
- Click the X button in the widget header

## Connecting to ROS2 (Production Mode)

### Step 1: Install Foxglove Bridge
```bash
pip install foxglove-bridge
```

### Step 2: Start Foxglove Bridge
```bash
foxglove-bridge
```

### Step 3: Start Your ROS2 Nodes
```bash
# In a new terminal
ros2 run demo_nodes_cpp talker
```

### Step 4: Configure Widgets
- Add widgets to your dashboard
- Enter the ROS2 topic names in the widget configuration
- The connection status should show "Connected" (green)

## Common Topics

- Camera: `/camera/image_raw`
- Lidar: `/velodyne_points`
- Joystick/Teleop: `/cmd_vel`
- Terminal/Logs: `/rosout`
- Button: `/cmd` (or your custom topic)
- Chart: `/sensor_data` (or any numeric topic)
- Topic Reader: Any topic you want to monitor

## Troubleshooting

**Dashboard won't start?**
- Make sure Node.js is installed: `node --version`
- Try deleting `node_modules` and running `npm install` again

**Can't connect to ROS2?**
- Make sure Foxglove Bridge is running
- Check the WebSocket URL (default: `ws://localhost:8765`)
- Verify ROS2 topics are publishing: `ros2 topic list`

**Widgets not showing data?**
- Check topic names match exactly
- Verify topics are publishing: `ros2 topic echo /your_topic`
- Check connection status in the top-right corner

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Customize widgets for your specific use case
- Add your own widgets by following the pattern in `src/components/widgets/`

