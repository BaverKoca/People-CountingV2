const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});
const multer = require('multer');
const path = require('path');
const { PythonShell } = require('python-shell');
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fsSync.existsSync(uploadsDir)) {
    fsSync.mkdirSync(uploadsDir);
}

// Configure CORS and middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST']
}));
app.use(express.json());
app.use(express.static('public'));

// Configure multer for video upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Add timestamp to prevent filename collisions
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `${timestamp}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /mp4|avi|mov|mkv/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only video files (mp4, avi, mov, mkv) are allowed!'));
        }
    },
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

// Keep track of active Python shells
const activePythonShells = new Map();

// Function to handle Python script execution
function executePythonScript(options, res, socket) {
    let results = [];
    let errorOccurred = false;
    let modelLoaded = false;
    let processTimeout;

    const pyshell = new PythonShell('detect_people.py', {
        ...options,
        pythonPath: process.platform === 'win32' ? 'python' : 'python3',
        mode: 'text'
    });

    // Store the pyshell instance with the socket ID
    activePythonShells.set(socket.id, pyshell);

    // Set a timeout for the entire process
    processTimeout = setTimeout(() => {
        errorOccurred = true;
        stopProcessing(socket.id);
        res.status(504).json({ 
            success: false, 
            error: 'Processing timeout - the operation took too long' 
        });
    }, 300000); // 5 minutes timeout

    pyshell.on('message', function (message) {
        try {
            // Check if the message is JSON
            if (message.trim().startsWith('{')) {
                const data = JSON.parse(message);
                if (data.error) {
                    console.error('Python error:', data.error);
                    errorOccurred = true;
                    res.status(500).json({ success: false, error: data.error });
                    stopProcessing(socket.id);
                } else if (data.status === 'Model loaded successfully') {
                    console.log('Model loaded successfully');
                    modelLoaded = true;
                    socket.emit('model_loaded');
                } else {
                    results.push(data);
                    socket.emit('frame_update', data);
                }
            } else {
                // Handle non-JSON messages
                console.log('Python output:', message);
            }
        } catch (e) {
            // Handle non-JSON messages
            console.log('Python output:', message);
        }
    });

    pyshell.on('stderr', function (stderr) {
        console.error('Python stderr:', stderr);
    });

    pyshell.on('error', function (err) {
        console.error('Python script error:', err);
        if (!errorOccurred) {
            res.status(500).json({ success: false, error: err.toString() });
        }
    });

    pyshell.on('close', function (code) {
        clearTimeout(processTimeout);
        console.log('Python script finished with code:', code);
        
        // Remove the pyshell instance when it's done
        activePythonShells.delete(socket.id);
        
        if (!errorOccurred) {
            if (!modelLoaded) {
                res.status(500).json({ success: false, error: 'Model failed to load' });
            } else {
                res.json({ success: true, messages: results });
            }
        }
    });
}

// Function to stop processing for a specific socket
async function stopProcessing(socketId) {
    try {
        const pyshell = activePythonShells.get(socketId);
        if (pyshell) {
            // Force kill the Python process
            await new Promise((resolve) => {
                pyshell.terminate();
                
                // Additional cleanup for Windows
                if (process.platform === 'win32' && pyshell.childProcess && pyshell.childProcess.pid) {
                    try {
                        process.kill(pyshell.childProcess.pid, 'SIGTERM');
                    } catch (e) {
                        console.log('Process already terminated');
                    }
                }
                
                resolve();
            });

            // Remove from active processes
            activePythonShells.delete(socketId);

            // Clean up any uploaded files for this session
            const uploadedFiles = Array.from(uploadsMap.get(socketId) || []);
            for (const file of uploadedFiles) {
                try {
                    await fs.unlink(file);
                    console.log(`Cleaned up file: ${file}`);
                } catch (err) {
                    console.error(`Error cleaning up file ${file}:`, err);
                }
            }
            uploadsMap.delete(socketId);
        }
    } catch (error) {
        console.error('Error in stopProcessing:', error);
    }
}

// Keep track of uploaded files per socket
const uploadsMap = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected with ID:', socket.id);
    
    let heartbeatInterval = setInterval(() => {
        socket.emit('ping');
    }, 25000);

    socket.on('disconnect', async (reason) => {
        console.log('User disconnected:', socket.id, 'Reason:', reason);
        clearInterval(heartbeatInterval);
        // Clean up any running processes when user disconnects
        await stopProcessing(socket.id);
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    socket.on('stop_processing', async () => {
        await stopProcessing(socket.id);
        socket.emit('processing_stopped');
    });

    socket.on('pong', () => {
        // Client responded to ping
    });
});

// Clean up old files in uploads directory
async function cleanupUploads() {
    try {
        const files = await fs.readdir(uploadsDir);
        const now = Date.now();
        
        for (const file of files) {
            try {
                const filePath = path.join(uploadsDir, file);
                const stats = await fs.stat(filePath);
                
                // Remove files older than 1 hour
                if (now - stats.mtime.getTime() > 3600000) {
                    await fs.unlink(filePath);
                    console.log('Cleaned up old file:', file);
                }
            } catch (err) {
                console.error('Error processing file during cleanup:', file, err);
            }
        }
    } catch (err) {
        console.error('Error during cleanup:', err);
    }
}

// Clean up uploads directory every hour
setInterval(cleanupUploads, 3600000);
cleanupUploads(); // Run cleanup on startup

// Routes
app.post('/upload', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded.' });
        }

        const socketId = req.body.socketId;
        if (!socketId) {
            return res.status(400).json({ success: false, error: 'No socket ID provided.' });
        }

        // Track the uploaded file
        if (!uploadsMap.has(socketId)) {
            uploadsMap.set(socketId, new Set());
        }
        uploadsMap.get(socketId).add(req.file.path);

        console.log('Processing video file:', req.file.path);
        console.log('Socket ID:', socketId);

        const options = {
            args: ['--source', req.file.path, '--type', 'video']
        };

        // Get the socket associated with this request
        const socket = io.sockets.sockets.get(socketId);
        if (!socket) {
            console.error('Socket not found for ID:', socketId);
            console.log('Active sockets:', Array.from(io.sockets.sockets.keys()));
            return res.status(400).json({ success: false, error: 'Invalid socket connection. Please refresh the page and try again.' });
        }

        executePythonScript(options, res, socket);
    } catch (err) {
        console.error('Error in upload route:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/process-youtube', async (req, res) => {
    try {
        const { url, socketId } = req.body;
        if (!url) {
            return res.status(400).json({ success: false, error: 'No URL provided.' });
        }

        if (!socketId) {
            return res.status(400).json({ success: false, error: 'No socket ID provided.' });
        }

        console.log('Processing YouTube URL:', url);
        console.log('Socket ID:', socketId);

        const options = {
            args: ['--source', url, '--type', 'youtube']
        };

        // Get the socket associated with this request
        const socket = io.sockets.sockets.get(socketId);
        if (!socket) {
            console.error('Socket not found for ID:', socketId);
            console.log('Active sockets:', Array.from(io.sockets.sockets.keys()));
            return res.status(400).json({ success: false, error: 'Invalid socket connection. Please refresh the page and try again.' });
        }

        executePythonScript(options, res, socket);
    } catch (err) {
        console.error('Error in process-youtube route:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Express error:', err.stack);
    res.status(500).json({ success: false, error: err.message });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
}); 