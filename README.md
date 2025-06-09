# 👥 People Counting System

A robust, real-time people counting system powered by **YOLOv8x** object detection. Effortlessly process uploaded videos or YouTube live streams to count people in each frame, with a modern web interface and live updates.

---

## 🚀 Features

- **Real-time people detection & counting**
- **Video file uploads:** MP4, AVI, MOV, MKV
- **YouTube live stream support**
- **Modern web interface** with live visualization
- **WebSocket (Socket.IO) communication** for instant updates
- **Automatic cleanup** of processed videos

---

## 🛠️ Prerequisites

- **Python** 3.8 or higher
- **Node.js** 14.0 or higher
- **npm** (Node Package Manager)

---

## ⚡ Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/People-CountingV.git
cd People-CountingV
```

### 2. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 3. Install Node.js dependencies
```bash
npm install
```

---

## ▶️ Usage

### 1. Start the server
```bash
npm start
```

### 2. Open your browser
[http://localhost:3000](http://localhost:3000)

### 3. Choose your input source
- **Upload a video file** (MP4, AVI, MOV, MKV)
- **Enter a YouTube live stream URL**

### 4. View results
- Real-time detection visualization
- Current people count
- Processed video frames

---

## 🧑‍💻 Technical Overview

**Backend:**
- Node.js (Express)
- Python (YOLOv8x)
- Socket.IO (real-time)
- Multer (file uploads)

**Frontend:**
- HTML5 / JavaScript
- TailwindCSS
- Socket.IO client

---

## ⚠️ Limitations

- **Max video file size:** 100MB
- **Supported formats:** MP4, AVI, MOV, MKV
- **Processing timeout:** 5 minutes
- **YouTube URL:** Must be public

---

## 🛟 Troubleshooting

<details>
<summary><strong>Model fails to load</strong></summary>

- Check internet connection & disk space
- Restart the server
</details>

<details>
<summary><strong>Video processing fails</strong></summary>

- Ensure format is supported & file < 100MB
- Check server logs
</details>

<details>
<summary><strong>Connection issues</strong></summary>

- System auto-reconnects
- Refresh the page or check your connection
</details>

---

## 📄 License

MIT License – see [LICENSE](LICENSE) for details.
