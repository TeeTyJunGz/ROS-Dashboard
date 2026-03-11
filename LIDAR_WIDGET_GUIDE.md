# 🎯 Enhanced Lidar Widget Guide

## Overview

The Lidar Widget has been completely redesigned to support **real ROS2 LaserScan and PointCloud2** data visualization with **RViz2-like 3D rendering**.

### Key Features

✅ **Dual Message Support** - LaserScan (2D) & PointCloud2 (3D)  
✅ **Auto-Detection** - Automatically detects message type  
✅ **RViz2-style Visualization** - Interactive 3D viewport  
✅ **Distance-Based Coloring** - Red (near) → Blue (far)  
✅ **Configurable Settings** - Point size, colors, coloring mode  
✅ **30 Hz Optimized** - Handles typical LiDAR frequencies  
✅ **Mock Data Fallback** - Tests without ROS2

---

## Features in Detail

### 1. **Dual Message Type Support**

#### LaserScan Messages (`sensor_msgs/LaserScan`)
- **Input**: Polar coordinates (angles + ranges)
- **Processing**: Converts to 3D Cartesian coordinates
- **Visualization**: Points displayed on XZ plane (2D scan → 3D view)
- **Use Case**: Traditional 2D LiDAR sensors

#### PointCloud2 Messages (`sensor_msgs/PointCloud2`)
- **Input**: 3D XYZ point cloud data
- **Processing**: Direct 3D point visualization
- **Visualization**: Full 3D point cloud in any orientation
- **Use Case**: 3D LiDAR or sensor fusion

#### Auto-Detection
The widget automatically detects the message type from incoming data:
- If message has `ranges` array → **LaserScan**
- If message has `points` array → **PointCloud2**
- If no messages → **Mock Data**

### 2. **3D RViz-style Visualization**

#### Interactive Controls
```
Mouse Controls:
  • Left Drag   → Rotate view
  • Scroll      → Zoom in/out
  • Middle Drag → Pan view
```

#### Visual Elements
- **Grid Helper**: Reference grid for spatial orientation (20x20 meters)
- **Multiple Lights**: Ambient + point lights for better visibility
- **Smooth Rendering**: GPU-accelerated via Three.js
- **Performance**: Handles up to 100,000 points

#### Camera Setup
- **Default Position**: [0, 10, 15] (elevated view)
- **Field of View**: 75°
- **Auto-damping**: Smooth momentum-based rotation

### 3. **Distance-Based Coloring**

#### Colormap Gradient
```
Distance   Color      RGB
0%        Red        (255, 0, 0)      - Closest points
25%       Orange     (255, 165, 0)
50%       Yellow     (255, 255, 0)
75%       Cyan       (0, 255, 255)
100%      Blue       (0, 0, 255)      - Farthest points
```

#### How It Works
1. **Auto-mapping**: Min/Max distances calculated per frame
2. **Normalization**: Each point's distance normalized to 0-1
3. **Color Lookup**: Colormap applied based on normalized distance
4. **Toggle**: Can be disabled for custom single color

### 4. **Configurable Settings**

| Setting | Type | Range | Default | Description |
|---------|------|-------|---------|-------------|
| **Point Size** | Slider | 0.5-10 px | 2 | Point size for visibility |
| **Color by Distance** | Toggle | On/Off | On | Enable distance-based coloring |
| **Point Color** | Color Picker | Any Hex | #00d4ff (Cyan) | Custom color when coloring off |
| **Topic** | Selector | Any Published | (empty) | Topic to subscribe to |

---

## Widget Configuration

### Configuration Object Structure

```javascript
widget.config = {
  // Required
  subscribeTopic: "/scan",           // Topic name (string)
  
  // Optional - Lidar specific
  pointSize: 2,                      // Point size 0.5-10 (number)
  useDistanceColor: true,            // Distance coloring (boolean)
  customColor: "#00d4ff"             // Color when distance coloring off (hex string)
}
```

### Default Configuration for New Widgets

```javascript
const defaultLidarConfig = {
  subscribeTopic: '',
  pointSize: 2,
  useDistanceColor: true,
  customColor: '#00d4ff'
}
```

---

## Usage Guide

### For End Users

#### Step 1: Add Widget
1. Click **"+"** button in top-right
2. Select **"Lidar"** from widget menu
3. Widget appears on dashboard

#### Step 2: Configure Topic
1. Click ⚙️ **Settings** button on widget
2. Enter topic name (e.g., `/scan`, `/lidar/point_cloud`)
3. Press **Enter** or click in another field
4. Widget subscribes automatically (if Foxglove Bridge connected)

#### Step 3: Adjust Visualization
- **Point Size**: Drag slider for visibility preference
- **Color Mode**: 
  - ✅ Toggle "Color by Distance" ON for rainbow visualization
  - ❌ Toggle OFF for single custom color
- **Custom Color**: Click color picker to choose color
- **Save**: Click Save button to apply changes

#### Step 4: Interact with Visualization
- **Rotate**: Click-drag on canvas to rotate
- **Zoom**: Scroll mouse wheel
- **Pan**: Middle-click + drag
- **Reset**: Reload widget to reset view

### For Testing (Without ROS2)

If no topic is configured or Foxglove Bridge is disconnected, the widget displays **mock point cloud data** automatically for testing visualization features.

---

## Data Format Specifications

### LaserScan Message Format

```javascript
{
  // Angle information
  angle_min: number,        // Minimum angle in radians (-π)
  angle_max: number,        // Maximum angle in radians (π)
  angle_increment: number,  // Angle between rays (typically ~0.0175 rad = 1°)
  
  // Time information
  time_increment: number,   // Time between measurements
  scan_time: number,        // Time for complete scan
  
  // Range information
  range_min: number,        // Minimum range in meters (e.g., 0.1)
  range_max: number,        // Maximum range in meters (e.g., 10.0)
  ranges: [number, ...],    // Array of range values per angle
  intensities: [number],    // Optional: reflection intensity per point
  
  // Header
  header: {
    frame_id: "laser_frame"
  }
}
```

#### Example LaserScan Data
```javascript
{
  angle_min: -1.5708,      // -90°
  angle_max: 1.5708,       // +90°
  angle_increment: 0.0175, // 1°
  range_min: 0.1,
  range_max: 10.0,
  ranges: [5.5, 5.4, 5.3, ..., 4.2],  // 180 values for 180° scan
  intensities: []
}
```

### PointCloud2 Message Format

```javascript
{
  // Point cloud data
  points: [
    {
      x: number,           // X coordinate (meters)
      y: number,           // Y coordinate (meters)
      z: number,           // Z coordinate (meters)
      rgb: number,         // Optional: packed RGB color (0xRRGGBB)
      intensity: number    // Optional: intensity/reflectance value
    },
    ...more points
  ],
  
  // Additional metadata
  width: number,           // Number of points
  height: number,          // 1 for unstructured cloud
  fields: [...],           // Field definitions
  header: {
    frame_id: "sensor_frame"
  }
}
```

#### Example PointCloud2 Data
```javascript
{
  points: [
    { x: 1.2, y: -0.5, z: 0.3 },
    { x: 1.5, y: 0.0, z: 0.2 },
    { x: 0.8, y: 0.7, z: 0.1 },
    ...
  ],
  width: 1000,
  height: 1,
  header: { frame_id: "base_link" }
}
```

---

## Setup & Connection

### Prerequisites

- **Foxglove Bridge** running and accessible
- **ROS2** with publishing LiDAR topics
- **Lidar Hardware** or simulator publishing sensor data

### Starting Foxglove Bridge

#### Option 1: Docker (Easiest)
```bash
docker run -p 8765:8765 foxglove/bridge:latest
```

#### Option 2: ROS2 Installation
```bash
# Terminal 1: Start Foxglove Bridge
ros2 launch foxglove_bridge foxglove_bridge_launch.xml

# Terminal 2: Publish test data (optional)
ros2 topic pub -r 30 /scan sensor_msgs/LaserScan '{
  angle_min: -1.5708,
  angle_max: 1.5708,
  angle_increment: 0.0175,
  time_increment: 0.0,
  scan_time: 0.033,
  range_min: 0.1,
  range_max: 10.0,
  ranges: [5.5, 5.4, 5.3, ...],
  intensities: []
}'
```

#### Option 3: With Real Lidar Hardware
```bash
# Start your lidar driver
ros2 launch your_lidar_driver lidar_launch.py

# Start Foxglove Bridge
ros2 launch foxglove_bridge foxglove_bridge_launch.xml

# Dashboard will automatically detect the topics
```

### Dashboard Connection

```bash
# Terminal 1: Start Dashboard
npm run dev

# Terminal 2: Start Backend (if needed)
npm run server

# Or both together:
npm run dev:all
```

Then open http://localhost:5173 in your browser.

---

## Troubleshooting

### Widget Shows "Mock Data"

**Cause**: No topic subscription or connection issue

**Solution**:
1. ✅ Verify Foxglove Bridge URL is correct (default: `ws://localhost:8765`)
2. ✅ Check browser **Developer Console** (F12) for connection messages
3. ✅ Verify topic name is correct (case-sensitive!)
4. ✅ Confirm ROS2 is publishing data: `ros2 topic list`

### Points Not Visible

**Cause**: Point size too small or camera at wrong position

**Solution**:
1. ✅ Increase **Point Size** slider in settings
2. ✅ **Zoom in** using mouse scroll wheel
3. ✅ **Drag-rotate** to see from different angles
4. ✅ Reload widget to reset camera position

### Colors Not Changing

**Cause**: Distance coloring toggle might be off

**Solution**:
1. ✅ Open **Settings** (⚙️)
2. ✅ Enable **"Color by Distance"** toggle
3. ✅ Click **Save**

### Performance Issues (Slow Updates)

**Cause**: Too many points or low-end GPU

**Solution**:
1. ✅ Reduce **Point Size** to smaller value
2. ✅ Limit range on ROS2 side: filter points before publishing
3. ✅ Use smaller/different topic with fewer points
4. ✅ Check GPU acceleration (DevTools → Performance)

### Connection Keeps Disconnecting

**Cause**: Network issues or bridge crash

**Solution**:
1. ✅ Check Foxglove Bridge logs
2. ✅ Verify network latency
3. ✅ Restart Foxglove Bridge
4. ✅ Check firewall settings (allow port 8765)

---

## Technical Implementation

### LaserScan to Cartesian Conversion

For each angle in the LaserScan:

```
angle = angle_min + (index × angle_increment)
range = ranges[index]

x = range × cos(angle)
z = range × sin(angle)
y = 0  // LaserScan is 2D, place on XZ plane
```

### Distance-Normalized Coloring

```javascript
// 1. Find min and max distances in point cloud
minDistance = Math.min(...distances)
maxDistance = Math.max(...distances)

// 2. Normalize each distance to 0-1
normalized = (distance - minDistance) / (maxDistance - minDistance)

// 3. Map to color using colormap
color = mapColormap(normalized)  // Red → Orange → Yellow → Cyan → Blue
```

### Three.js Optimization

- **Geometry**: `Float32Array` for vertex positions
- **Material**: `PointMaterial` with `vertexColors` support
- **Rendering**: `OrbitControls` with damping for smooth interaction
- **Limits**: Max 100,000 points per widget (configurable)

---

## Performance Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| **Max Points** | 100,000 | Three.js point limit |
| **Update Rate** | 30 Hz | Typical LiDAR rate |
| **Min Point Size** | 0.5 px | For dense clouds |
| **Max Point Size** | 10 px | For visibility |
| **Color Calculation** | O(n) | Per frame |
| **Memory per Point** | ~12 bytes | XYZ: 3×4 bytes |
| **Memory (100k points)** | ~1.2 MB | Pure geometry data |

---

## Advanced Features (Future)

These features are planned for future releases:

- [ ] **PointCloud2 RGB Visualization** - Display packed RGB colors
- [ ] **Intensity-Based Coloring** - Color by reflection intensity
- [ ] **Range Filtering** - Min/Max range sliders in widget
- [ ] **Historic Playback** - Record and replay point clouds
- [ ] **Multi-Cloud Overlay** - Visualize multiple clouds simultaneously
- [ ] **Custom Colormaps** - Vibrant, Plasma, Cool, Warm, etc.
- [ ] **Point Export** - Save point cloud as CSV/PCD
- [ ] **Frame of Reference** - Transform between frames
- [ ] **Ground Removal Filter** - Auto-filter ground points
- [ ] **3D Bounding Boxes** - Visualize detected objects

---

## Best Practices

### 1. **Topic Selection**
- ✅ Use `/scan` for 2D scans (LaserScan)
- ✅ Use `/cloud` or `/points` for 3D clouds (PointCloud2)
- ✅ Check topic type: `ros2 topic info -v /scan`

### 2. **Point Size Selection**
- 📊 **0.5-1.0 px**: For dense clouds (100k+ points)
- 📊 **2-3 px**: Standard visualization (good default)
- 📊 **5-10 px**: For sparse clouds or detail inspection

### 3. **Color Mode Selection**
- 🌈 **Distance-based**: Better for understanding range distribution
- 🎨 **Single color**: Better for displaying sensor coverage area
- 🎯 **Cyan/Blue**: Traditional ROS visualization default

### 4. **Performance Optimization**
- ✅ Filter unnecessary points at source (ROS publisher)
- ✅ Reduce update rate if bandwidth-constrained
- ✅ Use LaserScan instead of PointCloud2 when possible (lighter)
- ✅ Adjust point size to balance visibility and performance

---

## Glossary

- **LaserScan**: 2D polar coordinate representation of LiDAR data
- **PointCloud2**: 3D Cartesian coordinate representation of sensor data
- **Polar Coordinates**: (angle, range) representation
- **Cartesian Coordinates**: (x, y, z) 3D coordinate system
- **FOV (Field of View)**: Angle range a sensor can see
- **Colormap**: Function mapping scalar values to colors
- **RViz**: ROS Visualization tool (this widget mimics its style)
- **Foxglove Bridge**: WebSocket bridge connecting ROS2 to web applications

---

## Support & Feedback

For issues, questions, or feature requests:

1. Check the **Troubleshooting** section above
2. Review browser **Developer Console** (F12) for errors
3. Verify ROS2 data is publishing: `ros2 topic echo /scan`
4. Check Foxglove Bridge logs for connection issues
5. Open an issue on the GitHub repository with:
   - Error messages from console
   - Steps to reproduce
   - Your ROS/hardware setup

---

## References

- [ROS2 LaserScan Message](http://docs.ros.org/en/api/sensor_msgs/html/msg/LaserScan.html)
- [ROS2 PointCloud2 Message](http://docs.ros.org/en/api/sensor_msgs/html/msg/PointCloud2.html)
- [Foxglove Bridge Docs](https://docs.foxglove.dev/)
- [Three.js Documentation](https://threejs.org/)
- [RViz Documentation](http://wiki.ros.org/rviz)

