const socket = io({
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
});

let processingStarted = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// UI Elements
const loadingElement = document.getElementById('loading');
const statusBadge = document.getElementById('statusBadge');

// Add canvas context initialization
let canvas;
let ctx;
let frameImage;
let canvasInitialized = false;

function initializeCanvas() {
    canvas = document.getElementById('videoCanvas');
    frameImage = document.getElementById('frameImage');
    ctx = canvas.getContext('2d');
    canvasInitialized = true;

    // Set initial canvas size
    resizeCanvas();

    // Add window resize listener
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    if (!canvas) return;
    
    // Get the parent container width
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    
    // Set canvas size maintaining 16:9 aspect ratio
    canvas.width = containerWidth;
    canvas.height = (containerWidth * 9) / 16;
}

function updateConnectionStatus(status, color) {
    statusBadge.textContent = status;
    statusBadge.className = `px-3 py-1 rounded-full text-sm font-semibold text-white bg-${color}-500`;
}

function showLoading(message = 'Processing...') {
    const loadingElement = document.getElementById('loading');
    const loadingDetails = document.getElementById('loadingDetails');
    
    if (message.includes(':')) {
        // Split into main message and details if there's a colon
        const [main, details] = message.split(':');
        loadingDetails.textContent = details.trim();
    } else {
        loadingDetails.textContent = message;
    }
    
    loadingElement.classList.add('active');
}

function hideLoading() {
    const loadingElement = document.getElementById('loading');
    loadingElement.classList.remove('active');
}

function showUploadSection() {
    document.getElementById('uploadSection').classList.remove('hidden');
    document.getElementById('youtubeSection').classList.add('hidden');
    document.getElementById('resultSection').classList.add('hidden');
    resetProcessing();
}

function showYoutubeSection() {
    document.getElementById('youtubeSection').classList.remove('hidden');
    document.getElementById('uploadSection').classList.add('hidden');
    document.getElementById('resultSection').classList.add('hidden');
    resetProcessing();
}

function showResultSection() {
    document.getElementById('resultSection').classList.remove('hidden');
}

function resetProcessing() {
    processingStarted = false;
    hideLoading();
    
    // Clear canvas if it exists
    if (canvasInitialized && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    const peopleCount = document.getElementById('peopleCount');
    peopleCount.textContent = 'People Count: 0';
}

function showError(message) {
    console.error('Error:', message);
    alert(message);
    resetProcessing();
}

function updateFrame(data) {
    if (!processingStarted) return;

    const peopleCount = document.getElementById('peopleCount');
    const detectionDetails = document.getElementById('detectionDetails');

    try {
        // Initialize canvas if not done
        if (!canvasInitialized) {
            initializeCanvas();
        }

        // Update people count
        peopleCount.textContent = `People Count: ${data.count}`;

        // Update detection details
        if (data.detections) {
            detectionDetails.innerHTML = ''; // Clear previous detections
            data.detections.forEach((detection, index) => {
                const [x1, y1, x2, y2] = detection.box;
                const width = x2 - x1;
                const height = y2 - y1;
                const confidence = detection.confidence;

                const detectionBox = document.createElement('div');
                detectionBox.className = 'bg-white p-3 rounded-lg shadow-sm border border-gray-200';
                detectionBox.innerHTML = `
                    <div class="flex items-center justify-between">
                        <span class="font-medium">Person ${index + 1}</span>
                        <span class="text-green-600 font-semibold">${confidence}%</span>
                    </div>
                    <div class="mt-2 text-sm text-gray-600">
                        <div>Position: (${x1}, ${y1})</div>
                        <div>Size: ${width}x${height}px</div>
                    </div>
                `;
                detectionDetails.appendChild(detectionBox);
            });
        }

        // Update video frame
        if (data.frame) {
            const frameData = hexToBytes(data.frame);
            const blob = new Blob([frameData], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            
            // Load the new frame
            frameImage.onload = () => {
                // Clear the canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Draw the new frame
                ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
                
                // Draw detection boxes if available
                if (data.detections) {
                    // Calculate scale factors
                    const scaleX = canvas.width / frameImage.naturalWidth;
                    const scaleY = canvas.height / frameImage.naturalHeight;
                    
                    data.detections.forEach((detection, index) => {
                        const [x1, y1, x2, y2] = detection.box;
                        
                        // Scale coordinates to canvas size
                        const scaledX = x1 * scaleX;
                        const scaledY = y1 * scaleY;
                        const scaledWidth = (x2 - x1) * scaleX;
                        const scaledHeight = (y2 - y1) * scaleY;
                        
                        // Draw bounding box
                        ctx.strokeStyle = '#00ff00';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
                        
                        // Draw label
                        ctx.fillStyle = '#00ff00';
                        ctx.font = '14px Arial';
                        ctx.fillText(`Person ${index + 1} (${detection.confidence}%)`, 
                            scaledX, scaledY - 5);
                    });
                }
                
                // Clean up the blob URL
                URL.revokeObjectURL(url);
            };
            
            frameImage.src = url;
        }
    } catch (error) {
        console.error('Error updating frame:', error);
    }
}

// Keep connection alive
setInterval(() => {
    if (socket.connected) {
        socket.emit('ping');
    }
}, 20000);

// Socket.IO event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    reconnectAttempts = 0;
    updateConnectionStatus('Connected', 'green');
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected from server:', reason);
    updateConnectionStatus('Disconnected', 'red');
    
    if (processingStarted && reason !== 'io client disconnect') {
        // Only show reconnection message if the disconnect wasn't intentional
        updateConnectionStatus('Reconnecting...', 'yellow');
        setTimeout(() => {
            if (!socket.connected) {
                showError('Connection lost. Please refresh the page.');
            }
        }, 5000);
    }
});

socket.on('frame_update', (data) => {
    if (data.status) {
        // Update loading message with status
        showLoading(data.status);
    } else {
        // Update frame with detection results
        updateFrame(data);
    }
});

socket.on('error', (error) => {
    console.error('Socket error:', error);
    updateConnectionStatus('Error', 'red');
    showError('Connection error occurred');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    updateConnectionStatus('Connection Error', 'red');
    if (reconnectAttempts >= maxReconnectAttempts) {
        showError('Failed to connect to server. Please refresh the page.');
    }
});

socket.on('pong', () => {
    console.log('Received pong from server');
});

socket.on('model_loaded', () => {
    console.log('Model loaded successfully');
    showLoading('Processing video...');
});

// Form submission handlers
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('videoFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showError('Please select a video file');
        return;
    }

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
        showError('File size must be less than 50MB');
        return;
    }

    // Check file type
    const validTypes = ['video/mp4', 'video/avi', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
        showError('Please select a valid video file (mp4, avi, mov)');
        return;
    }

    const formData = new FormData();
    formData.append('video', file);
    formData.append('socketId', socket.id);

    try {
        showLoading('Loading YOLOv8x model...');
        processingStarted = true;
        showResultSection();

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Error processing video');
        }
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'Error uploading video');
    }
});

document.getElementById('youtubeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const urlInput = document.getElementById('youtubeUrl');
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('Please enter a YouTube URL');
        return;
    }

    // Basic YouTube URL validation
    if (!url.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/)) {
        showError('Please enter a valid YouTube URL');
        return;
    }

    try {
        showLoading('Loading YOLOv8x model...');
        processingStarted = true;
        showResultSection();

        const response = await fetch('/process-youtube', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                url,
                socketId: socket.id
            })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Error processing YouTube stream');
        }
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'Error processing YouTube stream');
    }
});

function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

// Initialize connection status
updateConnectionStatus('Connecting...', 'yellow');

// Add stop functionality
document.getElementById('stopButton').addEventListener('click', async function() {
    try {
        // Stop processing
        socket.emit('stop_processing');
        
        // Disconnect socket to ensure all connections are closed
        socket.disconnect();
        
        // Show loading indicator for cleanup
        showLoading('Cleaning up...');
        
        // Small delay to ensure server processes the stop request
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Refresh the page
        window.location.reload();
    } catch (error) {
        console.error('Error stopping process:', error);
        // Force refresh if there's an error
        window.location.reload();
    }
});

// Update socket event handlers
socket.on('processing_stopped', () => {
    console.log('Processing stopped by server');
    resetProcessing();
}); 