#!/usr/bin/python3

from lidar_mock.dummy_module import dummy_function, dummy_var
import rclpy
from rclpy.node import Node
import math
import time
import random

# Import all required message types
from sensor_msgs.msg import LaserScan
from geometry_msgs.msg import Accel
from std_msgs.msg import Int8, String

class MultiSensorMockNode(Node):
    def __init__(self):
        super().__init__('multi_sensor_mock_node')
        
        # 1. RPLidar A1 Publisher (30 Hz)
        self.lidar_pub = self.create_publisher(LaserScan, 'scan', 10)
        self.lidar_timer_period = 1.0 / 30.0
        self.lidar_timer = self.create_timer(self.lidar_timer_period, self.lidar_callback)
        self.num_lidar_points = 1008
        
        # 2. IMU Accel Publisher (50 Hz)
        self.accel_pub = self.create_publisher(Accel, 'test_accel', 10)
        self.accel_timer = self.create_timer(1.0 / 50.0, self.accel_callback)
        
        # 3. Int8 Sine Wave Publisher (10 Hz)
        self.sine_pub = self.create_publisher(Int8, 'test_message', 10)
        self.sine_timer = self.create_timer(1.0 / 10.0, self.sine_callback)
        self.sine_frequency = 0.5 # Hz for the math.sin wave
        
        # 4. Demo Talker Publisher (1 Hz)
        self.chatter_pub = self.create_publisher(String, 'chatter', 10)
        self.chatter_timer = self.create_timer(1.0, self.chatter_callback)
        self.chatter_count = 0
        
        self.get_logger().info('Multi-sensor mock node started! Publishing to /scan, /test_accel, /test_message, and /chatter.')

    def lidar_callback(self):
        msg = LaserScan()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = 'laser_frame'
        
        msg.angle_min = 0.0
        msg.angle_max = 2.0 * math.pi
        msg.angle_increment = (2.0 * math.pi) / self.num_lidar_points 
        msg.time_increment = self.lidar_timer_period / self.num_lidar_points
        msg.scan_time = self.lidar_timer_period
        
        msg.range_min = 0.15
        msg.range_max = 10.0
        
        current_time = time.time()
        base_distance = 5.0 + 2.0 * math.sin(current_time) 
        
        msg.ranges = []
        for i in range(self.num_lidar_points):
            distance = base_distance + 1.5 * math.sin(i * msg.angle_increment * 3)
            
            # Clamp distances
            if distance > msg.range_max: distance = msg.range_max
            elif distance < msg.range_min: distance = msg.range_min
                
            msg.ranges.append(float(distance))
            
        msg.intensities = [] 
        self.lidar_pub.publish(msg)

    def accel_callback(self):
        msg = Accel()
        # Simulate slight vibration on X and Y, and gravity (~9.81) on Z
        msg.linear.x = random.uniform(-0.1, 0.1)
        msg.linear.y = random.uniform(-0.1, 0.1)
        msg.linear.z = 9.81 + random.uniform(-0.05, 0.05)
        
        # Simulate slight angular drift
        msg.angular.x = random.uniform(-0.01, 0.01)
        msg.angular.y = random.uniform(-0.01, 0.01)
        msg.angular.z = random.uniform(-0.01, 0.01)
        
        self.accel_pub.publish(msg)

    def sine_callback(self):
        msg = Int8()
        current_time = time.time()
        
        # Calculate sine wave: math.sin returns -1.0 to 1.0. 
        # Multiply by 100 so it visibly fluctuates between -100 and 100.
        # Int8 has a strict limit of -128 to 127, so 100 is a safe amplitude.
        sine_value = 100.0 * math.sin(2.0 * math.pi * self.sine_frequency * current_time)
        
        # Convert to integer because the message type is Int8
        msg.data = int(sine_value)
        self.sine_pub.publish(msg)

    def chatter_callback(self):
        msg = String()
        msg.data = f'Hello World: {self.get_clock().now().to_msg()}'
        self.chatter_pub.publish(msg)
        self.chatter_count += 1

def main(args=None):
    rclpy.init(args=args)
    node = MultiSensorMockNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()