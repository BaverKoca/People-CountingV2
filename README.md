# People Counting System

A real-time people counting system using YOLOv8x for object detection. This application can process both uploaded videos and YouTube live streams to count the number of people in each frame.

## Features

- Real-time people detection and counting
- Support for video file uploads (MP4, AVI, MOV, MKV)
- Support for YouTube live stream processing
- Modern web interface with real-time updates
- WebSocket-based communication for live updates
- Automatic cleanup of processed videos

## Prerequisites

- Python 3.8 or higher
- Node.js 14.0 or higher
- npm (Node Package Manager)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/People-CountingV.git
cd People-CountingV
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Install Node.js dependencies:
```bash
npm install
```

## Usage

1. Start the server:
```bash
npm start
```

2. Open your web browser and navigate to:
```
http://localhost:3000
```

3. Choose your input source:
   - Upload a video file (supported formats: MP4, AVI, MOV, MKV)
   - Enter a YouTube live stream URL

4. The system will process the video and display:
   - Real-time people detection visualization
   - Current people count
   - Processed video frames

## Technical Details

- Backend:
  - Node.js Express server
  - Python with YOLOv8x for object detection
  - Socket.IO for real-time communication
  - Multer for file uploads

- Frontend:
  - HTML5 / JavaScript
  - TailwindCSS for styling
  - Socket.IO client for real-time updates

## Limitations

- Maximum video file size: 100MB
- Supported video formats: MP4, AVI, MOV, MKV
- Processing timeout: 5 minutes
- YouTube URL must be publicly accessible

## Troubleshooting

1. If the model fails to load:
   - Check your internet connection
   - Ensure you have enough disk space
   - Try restarting the server

2. If video processing fails:
   - Check if the video format is supported
   - Ensure the file size is under 100MB
   - Check the server logs for specific errors

3. If connection issues occur:
   - The system will attempt to reconnect automatically
   - If problems persist, refresh the page
   - Check your internet connection

## License

This project is licensed under the MIT License - see the LICENSE file for details.