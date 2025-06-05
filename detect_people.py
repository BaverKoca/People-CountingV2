import argparse
import cv2
import numpy as np
import json
import os
import torch
from ultralytics import YOLO
import sys
import traceback
from pathlib import Path
import torch.serialization
import yt_dlp

def get_youtube_url(url):
    """Get the direct video URL from YouTube link."""
    try:
        ydl_opts = {
            'format': 'best[ext=mp4]',
            'quiet': True,
            'no_warnings': True
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            video_url = info['url']
            return video_url
    except Exception as e:
        print(json.dumps({"error": f"Error processing YouTube URL: {str(e)}"}))
        return None

def ensure_model():
    """Ensure the YOLO model is available and downloaded."""
    try:
        model_path = Path(__file__).parent / "yolov8x.pt"
        if not model_path.exists():
            print(json.dumps({"status": "Downloading YOLOv8x model..."}))
            model = YOLO('yolov8x.pt')  # This will download the model if it doesn't exist
            if not model_path.exists():
                raise Exception("Failed to download model")
            print(json.dumps({"status": "Model downloaded successfully"}))
        return str(model_path)
    except Exception as e:
        print(json.dumps({"error": f"Error ensuring model: {str(e)}"}))
        return None

def load_model(model_path):
    """Load the YOLO model with proper error handling."""
    try:
        # Force CPU usage and disable gradients for inference
        torch.set_grad_enabled(False)
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        # Add safe globals for PyTorch 2.6+ compatibility
        torch.serialization.add_safe_globals([
            'ultralytics.nn.tasks.DetectionModel',
            'ultralytics.nn.modules.head.Detect',
            'ultralytics.nn.modules.block.C2f',
            'ultralytics.nn.modules.conv.Conv'
        ])
        
        # Load YOLO model with weights_only=False for compatibility
        model = YOLO(model_path)
        
        # Force CPU usage
        model.to('cpu')
        
        return model
    except Exception as e:
        print(json.dumps({"error": f"Error loading model: {str(e)}\nTraceback: {traceback.format_exc()}"}))
        return None

def process_video(source, video_type='video'):
    try:
        # Ensure model exists
        model_path = ensure_model()
        if not model_path:
            return

        # Load model
        model = load_model(model_path)
        if not model:
            return

        print(json.dumps({"status": "Model loaded successfully"}))

        # Handle video source
        if video_type == 'youtube':
            try:
                print(json.dumps({"status": "Processing YouTube URL..."}))
                video_url = get_youtube_url(source)
                if not video_url:
                    return
                cap = cv2.VideoCapture(video_url)
            except Exception as e:
                print(json.dumps({"error": f"Error processing YouTube URL: {str(e)}"}))
                return
        else:
            print(json.dumps({"status": "Opening video file..."}))
            cap = cv2.VideoCapture(source)

        if not cap.isOpened():
            print(json.dumps({"error": "Error opening video source"}))
            return

        # Get video properties
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        print(json.dumps({"status": f"Video loaded: {total_frames} frames at {fps} FPS"}))

        frame_count = 0
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break

            try:
                # Process every 3rd frame to reduce load
                if frame_count % 3 == 0:
                    # Report progress every 30 frames
                    if frame_count % 30 == 0 and total_frames > 0:
                        progress = (frame_count / total_frames) * 100
                        print(json.dumps({"status": f"Processing: {progress:.1f}% complete"}))

                    # Run YOLOv8 inference on the frame
                    results = model(frame, classes=0)  # class 0 is person in COCO dataset

                    # Get the number of detected people and their details
                    boxes = []
                    for box in results[0].boxes:
                        # Get box coordinates
                        x1, y1, x2, y2 = [int(x) for x in box.xyxy[0].tolist()]
                        # Get confidence score
                        conf = float(box.conf[0])
                        boxes.append({
                            'box': [x1, y1, x2, y2],
                            'confidence': round(conf * 100, 2)
                        })

                    # Draw boxes and labels
                    annotated_frame = results[0].plot()

                    # Add people count to the frame
                    cv2.putText(annotated_frame, f'People Count: {len(boxes)}', 
                                (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

                    # Convert frame to base64 for web display
                    _, buffer = cv2.imencode('.jpg', annotated_frame)
                    print(json.dumps({
                        "count": len(boxes),
                        "frame": buffer.tobytes().hex(),
                        "detections": boxes
                    }))

                frame_count += 1
            except Exception as e:
                print(json.dumps({"error": f"Error processing frame: {str(e)}"}))
                break

        cap.release()
        print(json.dumps({"status": "Processing complete"}))
    except Exception as e:
        print(json.dumps({"error": f"Unexpected error: {str(e)}\nTraceback: {traceback.format_exc()}"}))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=str, required=True, help='Path to video file or YouTube URL')
    parser.add_argument('--type', type=str, default='video', choices=['video', 'youtube'], help='Source type')
    args = parser.parse_args()

    process_video(args.source, args.type)

if __name__ == "__main__":
    main() 