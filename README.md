# ROS2 Dashboard

A modern, web-based ROS2 dashboard with drag-and-drop widgets and Foxglove Bridge integration. Built with React and Vite for fast development and deployment.

## Features

- 🎨 **Drag & Drop Interface**: Easily arrange widgets on your dashboard
- 📦 **7 Widget Types**: Camera, Lidar, Button, Terminal, Joystick, Chart, and Topic Reader
- 🔌 **Foxglove Bridge Integration**: Connect to ROS2 via WebSocket
- 🎯 **MVP Ready**: Mock data support for testing without ROS2
- 💻 **Windows Compatible**: Fully tested on Windows

## Widgets

1. **Camera Widget**: Display camera feeds from ROS2 topics
2. **Lidar Widget**: 3D point cloud visualization
3. **Button Widget**: Send commands to ROS2 topics
4. **Terminal Widget**: Monitor ROS2 log messages
5. **Joystick Widget**: Teleoperation control for robots
6. **Chart Widget**: Real-time data visualization
7. **Topic Reader Widget**: Display raw topic data (like `ros2 topic echo`)

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **ROS2** (for production use)
   - Installation guide: https://docs.ros.org/en/humble/Installation.html
   - For Windows: https://docs.ros.org/en/humble/Installation/Windows-Install-Binary.html

4. **Foxglove Bridge** (for ROS2 connection)
   - Installation: `pip install foxglove-bridge`
   - Or download from: https://foxglove.dev/docs/studio/connection/foxglove-bridge

## Installation Guide (Step by Step)

### Step 1: Clone or Download the Project

```bash
cd C:\Users\STUDENT\Documents\GitHub\ROS-Dashboard-1
```

### Step 2: Install Dependencies

Open PowerShell or Command Prompt in the project directory and run:

```bash
npm install
```

This will install all required packages including:
- React and React DOM
- Vite (build tool)
- react-grid-layout (drag and drop)
- Three.js (3D visualization)
- Recharts (charting)
- And more...

### Step 3: Configure Environment (Optional)

Create a `.env` file in the root directory if you want to customize the WebSocket URL:

```env
VITE_WS_URL=ws://localhost:8765
```

The default is `ws://localhost:8765` (Foxglove Bridge default port).

### Step 4: Start the Development Server

```bash
npm run dev
```

The dashboard will open automatically in your browser at `http://localhost:3000`

## Using the Dashboard

### MVP Mode (Without ROS2)

The dashboard works in MVP mode with mock data:

1. **Add Widgets**: Click on any widget in the left panel to add it to your dashboard
2. **Drag & Drop**: Click and hold the widget header to move widgets around
3. **Resize**: Drag the bottom-right corner of widgets to resize them
4. **Configure**: Each widget has input fields to configure topics and settings
5. **Remove**: Click the X button in the widget header to remove it

### Production Mode (With ROS2 and Foxglove Bridge)

#### Step 1: Start Foxglove Bridge

Open a new terminal and run:

```bash
# If installed via pip
foxglove-bridge

# Or if using ROS2 directly
ros2 run foxglove_bridge foxglove_bridge
```

The bridge will start on `ws://localhost:8765` by default.

#### Step 2: Start Your ROS2 Nodes

In another terminal, start your ROS2 nodes:

```bash
# Example: Start a talker node
ros2 run demo_nodes_cpp talker

# Or your custom nodes
ros2 run your_package your_node
```

#### Step 3: Connect the Dashboard

1. Open the dashboard in your browser (should already be running from `npm run dev`)
2. The connection status in the top-right should show "Connected" (green)
3. Add widgets and configure them with your ROS2 topic names

#### Step 4: Configure Widgets

For each widget, enter the appropriate ROS2 topic:

- **Camera**: `/camera/image_raw` (sensor_msgs/Image)
- **Lidar**: `/velodyne_points` (sensor_msgs/PointCloud2)
- **Button**: `/cmd` (std_msgs/String)
- **Terminal**: `/rosout` (rosgraph_msgs/Log)
- **Joystick**: `/cmd_vel` (geometry_msgs/Twist)
- **Chart**: `/sensor_data` (std_msgs/Float64)
- **Topic Reader**: Any topic you want to monitor

## Project Structure

```
ROS-Dashboard-1/
├── src/
│   ├── components/
│   │   ├── widgets/          # Individual widget components
│   │   │   ├── CameraWidget.jsx
│   │   │   ├── LidarWidget.jsx
│   │   │   ├── ButtonWidget.jsx
│   │   │   ├── TerminalWidget.jsx
│   │   │   ├── JoystickWidget.jsx
│   │   │   ├── ChartWidget.jsx
│   │   │   └── TopicReaderWidget.jsx
│   │   ├── Dashboard.jsx     # Main dashboard with grid layout
│   │   ├── Widget.jsx        # Widget wrapper
│   │   ├── WidgetPanel.jsx   # Widget selection panel
│   │   └── ConnectionStatus.jsx
│   ├── context/
│   │   └── WebSocketContext.jsx  # WebSocket connection management
│   ├── App.jsx               # Main app component
│   └── main.jsx              # Entry point
├── package.json
├── vite.config.js
└── README.md
```

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist/` directory. You can serve them with any static file server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js serve
npx serve dist
```

## Troubleshooting

### Connection Issues

1. **"Disconnected" status**: 
   - Ensure Foxglove Bridge is running
   - Check if the WebSocket URL is correct (default: `ws://localhost:8765`)
   - Verify firewall isn't blocking the connection

2. **No data in widgets**:
   - Verify ROS2 topics are publishing: `ros2 topic list`
   - Check topic names match widget configuration
   - Ensure message types are correct

### Build Issues

1. **npm install fails**:
   - Clear npm cache: `npm cache clean --force`
   - Delete `node_modules` and `package-lock.json`, then reinstall

2. **Port already in use**:
   - Change port in `vite.config.js` or kill the process using port 3000

### Windows-Specific Issues

1. **PowerShell execution policy**:
   - Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

2. **Path issues**:
   - Use forward slashes or double backslashes in paths
   - Ensure Node.js is in your PATH

## Development

### Adding New Widgets

1. Create a new component in `src/components/widgets/`
2. Add it to `WIDGET_COMPONENTS` in `src/components/Widget.jsx`
3. Add it to `WIDGET_TYPES` in `src/components/WidgetPanel.jsx`
4. Add default config in `getDefaultConfig()` in `src/App.jsx`

### Customizing Styles

All styles are in CSS files alongside components. The main theme colors:
- Background: `#1a1a1a`
- Widget background: `#2a2a2a`
- Accent color: `#00d4ff`

## Next Steps

- [ ] Add widget persistence (save/load dashboards)
- [ ] Implement real image decoding for camera widget
- [ ] Add PointCloud2 parser for lidar widget
- [ ] Add more chart types
- [ ] Implement widget templates
- [ ] Add authentication
- [ ] Add multi-robot support

## License

This project is open source and available for educational and commercial use.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Foxglove Bridge documentation: https://foxglove.dev/docs
3. Check ROS2 documentation: https://docs.ros.org

---

**Happy ROS2 Dashboard Building! 🚀**

