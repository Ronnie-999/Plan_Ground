// Main application script
pdfjsLib.GlobalWorkerOptions.workerSrc = './public/js/pdf.worker.min.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing application...');
    console.log('DOMContentLoaded event fired in script.js');

    // Import canvas transformation functions
    let getTransformState, setTransformState, applyZoom, handlePanning;

    async function initializeCanvasTransform() {
        const module = await import('./canvas_transform.js');
        getTransformState = module.getTransformState;
        setTransformState = module.setTransformState;
        applyZoom = module.applyZoom;
        handlePanning = module.handlePanning;

        // Initialize transform state
        setTransformState(1, 0, 0);
        
        // Initialize panning functionality
        handlePanning(canvas, ctx, redrawCanvas);

        // Zoom functionality
        canvas.addEventListener('wheel', function(e) {
            e.preventDefault();
            const delta = e.deltaY * -0.001; // Adjust zoom speed
            applyZoom(delta, canvas, ctx, redrawCanvas);
        });
    }

    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const drawingModeBtn = document.getElementById('drawingModeBtn');
    const eraserModeBtn = document.getElementById('eraserModeBtn');
    const undoBtn = document.getElementById('undoBtn');
    const importButton = document.getElementById('importButton');
    const fileInput = document.getElementById('fileInput');
    const sidebar = document.querySelector('.sidebar');
    const resizeHandle = document.querySelector('.resize-handle');
    const container = document.querySelector('.container');
    const themeToggleButton = document.getElementById('themeToggleButton');
    
    console.log('Elements found:', {
        canvas: !!canvas,
        drawingModeBtn: !!drawingModeBtn,
        eraserModeBtn: !!eraserModeBtn,
        undoBtn: !!undoBtn,
        importButton: !!importButton,
        fileInput: !!fileInput,
        themeToggleButton: !!themeToggleButton
    });

    let isDrawing = false;
    let isDrawingMode = false;
    let isEraserMode = false;
    let isResizing = false;
    const eraserSize = 20;
    const undoStack = [];
    
    // Function to save canvas state
    function saveCanvasState() {
        undoStack.push(canvas.toDataURL());
        if (undoStack.length > 50) {
            undoStack.shift();
        }
        console.log('Canvas state saved. Undo stack length:', undoStack.length);
    }

    // Function to clear undo stack
    function clearUndoStack() {
        undoStack.length = 0;
        saveCanvasState();
    }

    // Redraw canvas function
    function redrawCanvas() {
        if (undoStack.length > 0) {
            const currentState = undoStack[undoStack.length - 1];
            const img = new Image();
            img.onload = function() {
                ctx.save();
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const { zoomLevel, panX, panY } = getTransformState();
                ctx.translate(panX, panY);
                ctx.scale(zoomLevel, zoomLevel);
                ctx.drawImage(img, 0, 0);
                ctx.restore();
            };
            img.src = currentState;
        }
    }

    // Initialize file import manager
    if (window.FileImportManager) {
        const fileImportManager = new window.FileImportManager(
            canvas, 
            ctx, 
            saveCanvasState, 
            redrawCanvas,
            clearUndoStack
        );
        
        // Setup file input handlers
        fileImportManager.setupFileInputHandlers(importButton, fileInput);
        console.log('File import manager initialized');
    } else {
        console.error('FileImportManager not found');
    }

    // Set canvas size to match its display size
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Restore drawing context settings after resize
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        // Save initial state after resize
        if (undoStack.length === 0) {
            saveCanvasState();
        }
        redrawCanvas(); // Redraw to apply current zoom/pan after resize
    }

    // Initial resize
    resizeCanvas();

    // Resize canvas when window is resized
    window.addEventListener('resize', function() {
        setTimeout(resizeCanvas, 100);
    });

    // Call the async initialization function
    initializeCanvasTransform();

    // Sidebar resize functionality
    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    });

    function handleResize(e) {
        if (!isResizing) return;
        
        const newWidth = e.clientX;
        
        if (newWidth >= 50 && newWidth <= 300) {
            container.style.gridTemplateColumns = `${newWidth}px 1fr`;
            setTimeout(resizeCanvas, 10);
        }
    }

    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    }

    const lightModeBtn = document.getElementById('lightMode');
    const darkModeBtn = document.getElementById('darkMode');

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    }

    // Apply saved theme on load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        // Default to light mode if no preference is saved
        applyTheme('light');
    }

    lightModeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        applyTheme('light');
    });

    darkModeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        applyTheme('dark');
    });

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

    // Mouse events for drawing and erasing
    canvas.addEventListener('mousedown', function(e) {
        if (e.button === 0) { // Left mouse button
            isDrawing = true;
            const { zoomLevel, panX, panY } = getTransformState();
            ctx.beginPath();
            ctx.moveTo((e.offsetX - panX) / zoomLevel, (e.offsetY - panY) / zoomLevel);
        }
    });

    canvas.addEventListener('mousemove', function(e) {
        if (!isDrawing) return;

        const { zoomLevel, panX, panY } = getTransformState();
        const x = (e.offsetX - panX) / zoomLevel;
        const y = (e.offsetY - panY) / zoomLevel;

        if (isDrawingMode) {
            ctx.lineTo(x, y);
            ctx.stroke();
        } else if (isEraserMode) {
            ctx.clearRect(x - eraserSize / 2, y - eraserSize / 2, eraserSize, eraserSize);
        }
    });

    canvas.addEventListener('mouseup', function() {
        if (isDrawing) {
            isDrawing = false;
            saveCanvasState();
        }
    });

    canvas.addEventListener('mouseout', function() {
        if (isDrawing) {
            isDrawing = false;
            saveCanvasState();
        }
    });

    // Undo functionality
    undoBtn.addEventListener('click', function() {
        if (undoStack.length > 1) {
            undoStack.pop(); // Remove current state
            redrawCanvas(); // Redraw previous state
            console.log('Undo successful. Undo stack length:', undoStack.length);
        } else if (undoStack.length === 1) {
            // If only one state left, clear canvas and stack
            undoStack.pop();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            saveCanvasState(); // Save empty state
            console.log('Canvas cleared. Undo stack length:', undoStack.length);
        }
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

    // Drawing functionality
    canvas.addEventListener('mousedown', function(e) {
        if (e.button === 0 && (isDrawingMode || isEraserMode)) {
            isDrawing = true;
            
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            lastX = (mouseX / zoomLevel) - panX;
            lastY = (mouseY / zoomLevel) - panY;
            
            ctx.save();
            ctx.scale(zoomLevel, zoomLevel);
            ctx.translate(panX, panY);
            updateDrawingContext();
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            
            console.log(isEraserMode ? 'Started erasing at:' : 'Started drawing at:', lastX, lastY);
        }
    });

    canvas.addEventListener('mousemove', function(e) {
        if (isDrawing && (isDrawingMode || isEraserMode)) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const currentX = (mouseX / zoomLevel) - panX;
            const currentY = (mouseY / zoomLevel) - panY;
            
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
            
            lastX = currentX;
            lastY = currentY;
        }
    });

    canvas.addEventListener('mouseup', function() {
        if (isDrawing) {
            isDrawing = false;
            ctx.restore();
            saveCanvasState();
            console.log('Stroke completed, saved canvas state');
        }
    });

    canvas.addEventListener('mouseleave', function() {
        if (isDrawing) {
            isDrawing = false;
            ctx.restore();
            saveCanvasState();
            console.log('Stroke interrupted, saved canvas state');
        }
    });

    // Undo functionality
    undoBtn.addEventListener('click', function() {
        if (undoStack.length > 1) {
            undoStack.pop();
            redrawCanvas();
        }
    });

    // Zoom functionality
    canvas.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = zoomLevel * zoomFactor;
        
        if (newZoom >= minZoom && newZoom <= maxZoom) {
            const zoomPointX = (mouseX / zoomLevel) - panX;
            const zoomPointY = (mouseY / zoomLevel) - panY;
            
            zoomLevel = newZoom;
            
            panX = (mouseX / zoomLevel) - zoomPointX;
            panY = (mouseY / zoomLevel) - zoomPointY;
            
            redrawCanvas();
            
            console.log('Zoom level:', zoomLevel.toFixed(2));
        }
    });

    function updateDrawingContext() {
        ctx.strokeStyle = isEraserMode ? 'white' : 'black';
        ctx.lineWidth = isEraserMode ? eraserSize : 2;
        ctx.lineCap = 'round';
    }

    // Set up initial drawing style
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
});