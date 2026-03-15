#!/usr/bin/env python3

import argparse
import threading
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

import cv2


class VideoFrameSource:
    def __init__(self, video_path, fps=None, jpeg_quality=80):
        self.video_path = video_path
        self.jpeg_quality = max(10, min(100, jpeg_quality))
        self.capture = cv2.VideoCapture(video_path)
        if not self.capture.isOpened():
            raise RuntimeError(f"Failed to open video file: {video_path}")

        source_fps = self.capture.get(cv2.CAP_PROP_FPS)
        self.frame_interval = 1.0 / fps if fps and fps > 0 else 1.0 / (source_fps if source_fps and source_fps > 0 else 15.0)
        self.lock = threading.Lock()
        self.latest_frame = None
        self.running = False
        self.thread = None

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.thread is not None:
                        self.thread.join(timeout=1.0)
        self.capture.release()

    def get_frame(self):
        with self.lock:
            return self.latest_frame

    def _run(self):
        encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), self.jpeg_quality]

        while self.running:
            ok, frame = self.capture.read()
            if not ok:
                self.capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            success, encoded = cv2.imencode('.jpg', frame, encode_params)
            if success:
                with self.lock:
                    self.latest_frame = encoded.tobytes()

            time.sleep(self.frame_interval)


def build_handler(frame_source):
    class MjpegHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            request_path = urlparse(self.path).path

            if request_path == '/' and 'action=stream' in self.path:
                request_path = '/stream'

            if request_path in ('/', '/health'):
                self.send_response(HTTPStatus.OK)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
                return

            if request_path == '/snapshot.jpg':
                frame = frame_source.get_frame()
                if frame is None:
                    self.send_error(HTTPStatus.SERVICE_UNAVAILABLE, 'Frame not ready')
                    return

                self.send_response(HTTPStatus.OK)
                self.send_header('Content-Type', 'image/jpeg')
                self.send_header('Content-Length', str(len(frame)))
                self.end_headers()
                self.wfile.write(frame)
                return

            if request_path != '/stream':
                self.send_error(HTTPStatus.NOT_FOUND, 'Use /stream for MJPEG output')
                return


            self.send_response(HTTPStatus.OK)
            self.send_header('Cache-Control', 'no-cache, private')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
            self.end_headers()

            try:
                while True:
                    frame = frame_source.get_frame()
                    if frame is None:
                        time.sleep(0.05)
                        continue

                    self.wfile.write(b'--frame\r\n')
                    self.wfile.write(b'Content-Type: image/jpeg\r\n')
                    self.wfile.write(f'Content-Length: {len(frame)}\r\n\r\n'.encode('ascii'))
                    self.wfile.write(frame)
                    self.wfile.write(b'\r\n')
                    time.sleep(frame_source.frame_interval)
            except (BrokenPipeError, ConnectionResetError):
                return

        def log_message(self, format, *args):
            return

    return MjpegHandler


def parse_args():
    parser = argparse.ArgumentParser(description='Serve a looping video file as an MJPEG stream.')
    parser.add_argument('--video', required=True, help='Path to a local video file')
    parser.add_argument('--host', default='0.0.0.0', help='Host interface to bind')
    parser.add_argument('--port', type=int, default=8081, help='HTTP port to bind')
    parser.add_argument('--fps', type=float, default=None, help='Override output FPS')
    parser.add_argument('--jpeg-quality', type=int, default=80, help='JPEG quality from 10 to 100')
    return parser.parse_args()


def main():
    args = parse_args()
    frame_source = VideoFrameSource(args.video, fps=args.fps, jpeg_quality=args.jpeg_quality)
    frame_source.start()

    server = ThreadingHTTPServer((args.host, args.port), build_handler(frame_source))
    print(f'MJPEG simulator listening on http://{args.host}:{args.port}/stream')
    print(f'Snapshot endpoint: http://{args.host}:{args.port}/snapshot.jpg')

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        frame_source.stop()


if __name__ == '__main__':
    main()