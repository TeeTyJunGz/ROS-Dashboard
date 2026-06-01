#!/usr/bin/python3

from lidar_mock.dummy_module import dummy_function, dummy_var
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import PointCloud2
from std_msgs.msg import Header
import sensor_msgs_py.point_cloud2 as pc2
import math
import time

class SimulatedVelodyneNode(Node):
    def __init__(self):
        super().__init__('simulated_velodyne')
        # Publish to a standard 3D LiDAR topic
        self.publisher_ = self.create_publisher(PointCloud2, 'velodyne_points', 10)
        
        # 10 Hz is the standard rotation rate for most Velodyne VLP-16 configurations
        self.timer = self.create_timer(1.0 / 20.0, self.timer_callback) 
        
        self.get_logger().info('Simulated Velodyne VLP-16 started! Publishing to /velodyne_points')

    def timer_callback(self):
        header = Header()
        header.stamp = self.get_clock().now().to_msg()
        header.frame_id = 'velodyne' # Standard frame for Velodyne

        points = []
        current_time = time.time()
        
        # The base size of our simulated "room"
        base_radius = 4.0 + math.sin(current_time * 0.5)

        # VLP-16 has 16 vertical lasers spanning roughly -15 to +15 degrees
        vertical_angles = [math.radians(deg) for deg in range(-15, 16, 2)]

        # Horizontal resolution
        # Note: A real VLP-16 generates ~300,000 points/sec. 
        # We cap this to 100 steps per ring (1,600 total points per message) 
        # so pure Python doesn't lag your CPU.
        horizontal_steps = 100
        angle_increment = (2.0 * math.pi) / horizontal_steps

        for v_angle in vertical_angles:
            for i in range(horizontal_steps):
                h_angle = i * angle_increment

                # Add some mathematical noise to create a 3D environment texture
                r = base_radius + 0.5 * math.cos(h_angle * 4) + 0.2 * math.sin(v_angle * 10)

                # Convert spherical coordinates to standard ROS Cartesian (X front, Y left, Z up)
                x = r * math.cos(v_angle) * math.cos(h_angle)
                y = r * math.cos(v_angle) * math.sin(h_angle)
                z = r * math.sin(v_angle)

                # Append the coordinate
                points.append([x, y, z])

        # Pack the pure Python floats into a structured PointCloud2 binary message
        pc_msg = pc2.create_cloud_xyz32(header, points)

        self.publisher_.publish(pc_msg)

def main(args=None):
    rclpy.init(args=args)
    node = SimulatedVelodyneNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()