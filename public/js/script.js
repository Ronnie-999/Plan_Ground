document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const drawingModeBtn = document.getElementById('drawingModeBtn');
    const eraserModeBtn = document.getElementById('eraserModeBtn');
    const undoBtn = document.getElementById('undoBtn');
    const sidebar = document.querySelector('.sidebar');
    const resizeHandle = document.querySelector('.resize-handle');
    const container = document.querySelector('.container');
    let isDrawing = false;
    let isDrawingMode = false;
    let isEraserMode = false;
    let lastX = 0;
    let lastY = 0;
    let isResizing = false;
    const eraserSize = 20;
    const undoStack = [];
    
    // Save initial canvas state
    saveCanvasState();

    // Sidebar resize functionality
    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    });

    function handleResize(e) {
        if (!isResizing) return;
        
        // Calculate new width based on mouse position
        const newWidth = e.clientX;
        
        // Apply constraints
        if (newWidth >= 50 && newWidth <= 300) {
            container.style.gridTemplateColumns = `${newWidth}px 1fr`;
            // Force canvas to update its size
            resizeCanvas();
        }
    }

    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    }

    // Set canvas size to match its display size
    function resizeCanvas() {
        // Save current canvas content
        const tempImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Restore saved content
        ctx.putImageData(tempImage, 0, 0);
        
        // Restore drawing context settings after resize
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
    }

    // Initial resize
    resizeCanvas();

    // Resize canvas when window is resized
    window.addEventListener('resize', resizeCanvas);

    // Toggle drawing mode
    drawingModeBtn.addEventListener('click', function() {
        isDrawingMode = !isDrawingMode;
        if (isDrawingMode) {
            isEraserMode = false;
            eraserModeBtn.classList.remove('active');
        }
        drawingModeBtn.classList.toggle('active');
        canvas.style.cursor = isDrawingMode ? 'crosshair' : 'default';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        console.log('Drawing mode:', isDrawingMode ? 'enabled' : 'disabled');
    });

    // Toggle eraser mode
    eraserModeBtn.addEventListener('click', function() {
        isEraserMode = !isEraserMode;
        if (isEraserMode) {
            isDrawingMode = false;
            drawingModeBtn.classList.remove('active');
        }
        eraserModeBtn.classList.toggle('active');
        canvas.style.cursor = isEraserMode ? 'cell' : 'default';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = eraserSize;
        console.log('Eraser mode:', isEraserMode ? 'enabled' : 'disabled');
    });

    // Start drawing/erasing on left mouse button down
    canvas.addEventListener('mousedown', function(e) {
        if (e.button === 0 && (isDrawingMode || isEraserMode)) { // Left mouse button and either mode is active
            isDrawing = true;
            lastX = e.offsetX;
            lastY = e.offsetY;
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            console.log(isEraserMode ? 'Started erasing at:' : 'Started drawing at:', lastX, lastY);
            // Save canvas state before starting new stroke
            saveCanvasState();
        }
    });

    // Function to save canvas state
    function saveCanvasState() {
        undoStack.push(canvas.toDataURL());
        // Limit the undo stack size to prevent memory issues
        if (undoStack.length > 50) {
            undoStack.shift(); // Remove oldest state if stack gets too large
        }
    }

    // Undo button click handler
    undoBtn.addEventListener('click', function() {
        if (undoStack.length > 1) { // Keep at least the initial state
            undoStack.pop(); // Remove current state
            const lastState = undoStack[undoStack.length - 1];
            const img = new Image();
            img.src = lastState;
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
        }
    });

    // Draw/erase line while moving mouse
    canvas.addEventListener('mousemove', function(e) {
        if (isDrawing && (isDrawingMode || isEraserMode)) {
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
            lastX = e.offsetX;
            lastY = e.offsetY;
        }
    });

    // Stop drawing when mouse button is released or leaves canvas
    canvas.addEventListener('mouseup', function() {
        if (isDrawing) {
            isDrawing = false;
            // Save canvas state after completing the stroke
            saveCanvasState();
            console.log('Stroke completed, saved canvas state');
        }
    });

    canvas.addEventListener('mouseleave', function() {
        if (isDrawing) {
            isDrawing = false;
            // Save canvas state if stroke was interrupted by leaving canvas
            saveCanvasState();
            console.log('Stroke interrupted, saved canvas state');
        }
    });



    // Set up drawing style
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
});