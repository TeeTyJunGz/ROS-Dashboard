# ROS Dashboard

ROS Dashboard is a web-based control and monitoring interface for ROS 2 robots. It combines a React frontend, a Node.js backend, Foxglove Bridge connectivity, per-robot dashboard storage, and user access control in one project.

This project is designed for teams that want to:
- monitor multiple robots from one browser UI
- build drag-and-drop dashboards without writing a custom frontend for every robot
- visualize ROS 2 data in real time
- send commands from the browser to ROS 2 topics
- separate view, control, and edit permissions for different users
- prevent command conflicts with a robot control lock

The project targets **ROS 2 Humble**.

## Quick Start

If you want the shortest path to get the project running, follow this section first.

### Quick Start Checklist

1. Install **ROS 2 Humble**
2. Install **Node.js** and **npm**
3. Clone this repository
4. Build the included `ros2_ws`
5. Install Node.js dependencies with `npm install`
6. Export the first admin login credentials
7. Start the dashboard
8. Start Foxglove Bridge
9. Login and open a robot dashboard

### Quick Start Commands

Clone the project:

```bash
git clone https://github.com/TeeTyJunGz/ROS-Dashboard.git
cd ROS-Dashboard
```

Build the included ROS 2 workspace:

```bash
source /opt/ros/humble/setup.bash
cd ros2_ws
rosdep install --from-paths src --ignore-src -r -y
colcon build
source install/setup.bash
cd ..
```

Install dashboard dependencies:

```bash
npm install
```

Create the first admin login:

```bash
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=admin123
```

Start the dashboard frontend and backend:

```bash
npm run dev:all
```

In another terminal, start Foxglove Bridge:

```bash
source /opt/ros/humble/setup.bash
source /path/to/ROS-Dashboard/ros2_ws/install/setup.bash
ros2 run foxglove_bridge foxglove_bridge
```

Then open the browser:

```text
http://localhost:3000
```

Login with:

```text
username: admin
password: admin123
```

### First-Time User Flow

After login, this is the normal order for new users:

1. Open the robot selection page
2. Add a robot from the top-right add button if needed
3. Open a robot dashboard
4. Add widgets from the widget panel
5. Configure each widget topic or port
6. Save or export the dashboard when finished

### Quick Test with Mock ROS 2 Data

This repository includes mock publishers inside `ros2_ws`, so you can test without a full robot.

Example:

```bash
source /opt/ros/humble/setup.bash
source /path/to/ROS-Dashboard/ros2_ws/install/setup.bash
ros2 run lidar_mock simulated_sensor.py
```

For 3D point cloud testing:

```bash
ros2 run lidar_mock simulated_velodyne.py
```

## What This Project Includes

### Frontend
- React + Vite dashboard application
- drag-and-drop widget layout
- multi-page dashboard editor
- per-robot saved dashboard state
- login page and admin page
- multi-robot selection screen

### Backend
- Express server
- SQLite database for users, permissions, robots, and saved dashboards
- JWT authentication stored in HTTP-only cookies
- per-robot control lock API
- browser terminal proxy using WebSocket + PTY
- dashboard import/export API

### ROS 2 Side
- Foxglove Bridge support for ROS topic subscribe/publish
- optional MJPEG stream support for camera widgets
- included `ros2_ws` folder for ROS-side packages and examples
- included mock LiDAR publishers for testing

## Main Features

- **Multi-robot management**
  Add, edit, and delete robot connections from the robot selection page.

- **Authentication and admin control**
  Login is required. Admin users can create users, manage permissions, and manage robot access.

- **Per-robot permissions**
  Each user can be granted:
  - view
  - control
  - edit

- **Control lock**
  Only one user can actively control a robot at a time. This prevents conflicting commands from browser widgets such as joystick, buttons, and terminal.

- **Dashboard persistence**
  Each robot has its own saved dashboard layout and pages.

- **Dashboard import/export**
  Export a dashboard to JSON and import it later or share it with teammates.

- **Real-time ROS 2 integration**
  Uses Foxglove Bridge to subscribe to topics and publish commands directly from the browser.

## Widgets

The dashboard currently includes these widget types:

1. **Camera Widget**
   Shows an MJPEG video stream from the selected robot.

2. **Lidar Widget**
   Visualizes both:
   - `sensor_msgs/LaserScan` for 2D LiDAR
   - `sensor_msgs/PointCloud2` for 3D LiDAR

3. **Button Widget**
   Publishes user-defined data to a ROS 2 topic when clicked.

4. **Terminal Widget**
   Opens a robot terminal session in the browser through the backend PTY bridge.

5. **Joystick Widget**
   Sends motion commands such as `cmd_vel` style control data.

6. **Chart Widget**
   Displays numeric topic data in real time.

7. **Topic Reader Widget**
   Shows raw topic messages in a readable panel, similar to a browser-based `ros2 topic echo`.

## Project Structure

```text
ROS-Dashboard/
├── backend/                 # SQLite and backend helpers
├── dashboards/              # Dashboard-related assets
├── ros2_ws/                 # ROS 2 workspace content included with the repo
├── src/
│   ├── components/
│   │   ├── widgets/         # All dashboard widget components
│   ├── context/             # Auth, fleet, WebSocket, terminal state
│   ├── utils/               # Helpers and data extraction
├── data/                    # SQLite database is created here at runtime
├── server.js                # Express backend
├── package.json             # Frontend + backend scripts
└── README.md
```

## Prerequisites

Install these before running the project:

1. **ROS 2 Humble**
   Official install guide:
   https://docs.ros.org/en/humble/Installation.html

2. **Node.js and npm**
   Recommended: Node.js 18+ and npm 9+

3. **colcon** and normal ROS 2 build tools

4. **Foxglove Bridge**
   You can use the included ROS workspace package or install it in your own ROS environment.

5. **Optional camera MJPEG server**
   For camera widgets, you need a stream source that serves MJPEG over HTTP.

## Installation

### 1. Install ROS 2 Humble

Follow the official ROS 2 Humble instructions for your OS.

After installation, verify ROS 2 works:

```bash
source /opt/ros/humble/setup.bash
ros2 topic list
```

### 2. Install Node.js and npm

Verify both commands work:

```bash
node --version
npm --version
```

### 3. Clone this repository

```bash
git clone https://github.com/TeeTyJunGz/ROS-Dashboard.git
cd ROS-Dashboard
```

### 4. Prepare the ROS workspace

This repository already includes a `ros2_ws` folder.

You have two common options:

#### Option A: Use the included workspace directly

```bash
cd ros2_ws
rosdep install --from-paths src --ignore-src -r -y
colcon build
source install/setup.bash
cd ..
```

#### Option B: Copy the included ROS packages into your own workspace

If you already have a ROS 2 workspace such as `~/ros2_ws`, copy the packages from this repository into your workspace `src` folder, then build your own workspace.

Example:

```bash
cp -r ros2_ws/src/* ~/ros2_ws/src/
cd ~/ros2_ws
rosdep install --from-paths src --ignore-src -r -y
colcon build
source install/setup.bash
```

## Node.js Dependencies

Install the dashboard dependencies:

```bash
npm install
```

## Admin Login Setup

This project does **not** hardcode the default admin username/password in source code.

The backend bootstraps the first admin account from these environment variables:
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Example:

```bash
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=admin123
```

Then start the backend for the first time. If there is no admin user in the database yet, it will create one.

### Login Example

If you use the example values above, login with:

```text
username: admin
password: admin123
```

### Where to change the admin username and password

The bootstrap logic is in `server.js`, and the users are stored in the SQLite database created at:

```text
data/ros-dashboard.db
```

Important behavior:
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` are used **only when no admin user exists yet**
- once the database already has an admin user, changing the environment variables will not replace that user automatically

If you want a different first admin account:
1. set `ADMIN_USERNAME` and `ADMIN_PASSWORD` before the first backend start, or
2. remove/reset the local database and start again so bootstrap runs again

## Run the Project

### 6.1 Run the dashboard app

From the repository root:

```bash
npm run dev:all
```

This starts:
- Vite frontend
- Node.js backend

Default local URLs:
- frontend: `http://localhost:3000`
- backend API: `http://localhost:5000`

### 6.2 Run Foxglove Bridge

In another terminal, source your ROS 2 environment and workspace first, then run:

```bash
source /opt/ros/humble/setup.bash
source /path/to/your/ros2_ws/install/setup.bash
ros2 run foxglove_bridge foxglove_bridge
```

If you are using the included workspace directly from this repository, that usually looks like:

```bash
source /opt/ros/humble/setup.bash
source ~/path/to/ROS-Dashboard/ros2_ws/install/setup.bash
ros2 run foxglove_bridge foxglove_bridge
```

Foxglove Bridge normally listens on port `8765`.

### 6.3 Run an MJPEG webcam server (optional)

This is only required if you want the Camera widget to show a live stream.

The camera widget expects an MJPEG stream URL like:

```text
http://<robot-ip>:8081/stream
```

One common option on ROS 2 is `web_video_server`.

Example:

```bash
ros2 run web_video_server web_video_server --ros-args -p port:=8081
```

If you use another MJPEG server, make sure the robot configuration points to the correct port.

## Recommended Startup Order

1. Source ROS 2 Humble
2. Source your built workspace
3. Start Foxglove Bridge
4. Start your robot nodes or test publishers
5. Start the dashboard with `npm run dev:all`
6. Open the browser and login

## First Login and Basic Use

1. Open the dashboard in your browser
2. Login with the bootstrap admin account
3. On the robot selection page:
   - open an existing robot, or
   - add a new robot using the add button in the top-right corner
4. Open a robot dashboard
5. Add widgets and configure topics/ports
6. Save or export the dashboard if needed

## Robot Configuration

Each robot entry stores:
- robot name
- robot IP address
- Foxglove Bridge port
- terminal WebSocket port
- MJPEG camera port

This lets the same dashboard frontend work with multiple robots without hardcoding a single IP.

## Example ROS 2 Test Commands

The included workspace contains example LiDAR mock publishers.

After building and sourcing your workspace, you can run:

```bash
ros2 run lidar_mock simulated_sensor.py
```

and/or:

```bash
ros2 run lidar_mock simulated_velodyne.py
```

Useful for testing:
- LiDAR widget
- chart widget
- topic reader widget

## Scripts

From the repository root:

```bash
npm install       # install frontend/backend dependencies
npm run dev       # run frontend only
npm run server    # run backend only
npm run dev:all   # run frontend and backend together
npm run build     # production build
```

## Access Control Model

### Roles
- **Admin**
  Full access to all robots and the admin page.

- **User**
  Access depends on per-robot permissions assigned by an admin.

### Permissions
For each robot, a user can be assigned:
- **View**: open the robot dashboard
- **Control**: use control widgets and request the control lock
- **Edit**: modify layout, widget settings, and saved dashboard state

### Control Lock
For safety, control widgets are protected by a robot lock.

This affects features like:
- joystick
- terminal
- command buttons
- other control-side actions

Only one controlling user should hold the lock at a time.

## Dashboard Features

Each robot dashboard supports:
- multiple pages
- drag-and-drop widget layout
- widget resizing
- per-widget settings
- saved layout per robot
- import/export as JSON
- connection status display
- access notices for view-only or locked control state