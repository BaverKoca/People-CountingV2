# 👥 People Counting System

A robust, real-time people counting system powered by **YOLOv8x** object detection. Effortlessly process uploaded videos or YouTube live streams to count people in each frame, with a modern web interface and live updates.

---

## 🖼️ Screenshots
![Image](https://github.com/user-attachments/assets/a4f4f05f-59fe-4239-971c-9a545a4b568e)
![Image](https://github.com/user-attachments/assets/082910f6-a35e-4b12-982f-f7db9a63b7da)
![Image](https://github.com/user-attachments/assets/eb6b180b-f84e-4b0d-b4a2-cdd36226f254)
![Image](https://github.com/user-attachments/assets/70ce7c28-5c6a-406d-afb4-ba366585eb13)
![Image](https://github.com/user-attachments/assets/ca53a75a-12f4-4bb4-a251-192a73146da4)
![Image](https://github.com/user-attachments/assets/febf058b-0d56-4d2f-a5a6-fcab81e229c2)
![Image](https://github.com/user-attachments/assets/961420af-71b9-489b-81f9-1560e75272df)

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
