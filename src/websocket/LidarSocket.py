import asyncio
import json
import math
import random
import time
import websockets

async def lidar_publisher(websocket):
    while True:
        t = time.time()
        msg = {
            "topic": "/scan",
            "msg": {
                "header": {
                    "stamp": {"sec": int(t), "nanosec": int((t % 1) * 1e9)},
                    "frame_id": "laser_frame"
                },
                "angle_min": -1.57,
                "angle_max": 1.57,
                "angle_increment": 0.01,
                "time_increment": 0.0,
                "scan_time": 0.1,
                "range_min": 0.2,
                "range_max": 10.0,
                "ranges": [random.uniform(0.5, 5.0) for _ in range(315)],
                "intensities": [random.uniform(50, 100) for _ in range(315)]
            }
        }

        await websocket.send(json.dumps(msg))
        await asyncio.sleep(0.1)  # 10 Hz publish rate

async def main():
    async with websockets.serve(lidar_publisher, "0.0.0.0", 8765):
        print("✅ LIDAR WebSocket mock server started at ws://localhost:8765")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
