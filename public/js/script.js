document.addEventListener('DOMContentLoaded', function() {
    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    
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
    let isDrawing = false;
    let isDrawingMode = false;
    let isEraserMode = false;
    let lastX = 0;
    let lastY = 0;
    let isResizing = false;
    const eraserSize = 20;
    const undoStack = [];
    let zoomLevel = 1;
    let panX = 0;
    let panY = 0;
    const minZoom = 0.1;
    const maxZoom = 5;
    
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
            
            // Convert mouse coordinates to canvas coordinates considering zoom and pan
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
            redrawCanvas(); // Use the new redraw function that handles zoom
        }
    });

    // Draw/erase line while moving mouse
    canvas.addEventListener('mousemove', function(e) {
        if (isDrawing && (isDrawingMode || isEraserMode)) {
            // Convert mouse coordinates to canvas coordinates considering zoom and pan
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

    // Stop drawing when mouse button is released or leaves canvas
    canvas.addEventListener('mouseup', function() {
        if (isDrawing) {
            isDrawing = false;
            ctx.restore();
            // Save canvas state after completing the stroke
            saveCanvasState();
            console.log('Stroke completed, saved canvas state');
        }
    });

    canvas.addEventListener('mouseleave', function() {
        if (isDrawing) {
            isDrawing = false;
            ctx.restore();
            // Save canvas state if stroke was interrupted by leaving canvas
            saveCanvasState();
            console.log('Stroke interrupted, saved canvas state');
        }
    });

    // Set up drawing style
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // Zoom functionality
    function applyTransform() {
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(zoomLevel, zoomLevel);
        ctx.translate(panX, panY);
    }

    function resetTransform() {
        ctx.restore();
    }

    function redrawCanvas() {
        if (undoStack.length > 0) {
            const currentState = undoStack[undoStack.length - 1];
            const img = new Image();
            img.onload = function() {
                ctx.save();
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.scale(zoomLevel, zoomLevel);
                ctx.translate(panX, panY);
                ctx.drawImage(img, 0, 0);
                ctx.restore();
            };
            img.src = currentState;
        }
    }

    // Mouse wheel zoom
    canvas.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate zoom factor
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = zoomLevel * zoomFactor;
        
        // Apply zoom limits
        if (newZoom >= minZoom && newZoom <= maxZoom) {
            // Calculate new pan to zoom towards mouse position
            const zoomPointX = (mouseX / zoomLevel) - panX;
            const zoomPointY = (mouseY / zoomLevel) - panY;
            
            zoomLevel = newZoom;
            
            panX = (mouseX / zoomLevel) - zoomPointX;
            panY = (mouseY / zoomLevel) - zoomPointY;
            
            redrawCanvas();
            
            console.log('Zoom level:', zoomLevel.toFixed(2));
        }
    });

    // Update drawing context settings after zoom
    function updateDrawingContext() {
        ctx.strokeStyle = isEraserMode ? 'white' : 'black';
        ctx.lineWidth = isEraserMode ? eraserSize : 2;
        ctx.lineCap = 'round';
    }

    // Import button click handler
    importButton.addEventListener('click', function() {
        fileInput.click(); // Programmatically click the hidden file input
    });

    // File input change handler
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            handleFileImport(file);
        }
    });

    // Function to clear the canvas
    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Optionally, reset undo stack if clearing means a fresh start
        undoStack.length = 0;
        saveCanvasState(); // Save the cleared state
    }

    // Function to handle file import
    function handleFileImport(file) {
        console.log('handleFileImport called with file:', file.name, file.type);
        clearCanvas(); // Clear canvas before importing new content

        if (file.type === 'application/pdf') {
            const fileReader = new FileReader();
            fileReader.onload = function() {
                const typedarray = new Uint8Array(this.result);
                console.log('Attempting to load PDF document...');
                pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                    console.log('PDF document loaded successfully.');
                    pdf.getPage(1).then(function(page) {
                        const viewport = page.getViewport({ scale: 1 });
                        
                        // Use a fixed scale that matches drawing scale (1:1 pixel ratio)
                        const drawingScale = 1;
                        const scaledViewport = page.getViewport({ scale: drawingScale });

                        // Calculate position to center the PDF
                        const x = (canvas.width - scaledViewport.width) / 2;
                        const y = (canvas.height - scaledViewport.height) / 2;

                        const renderContext = {
                            canvasContext: ctx,
                            viewport: scaledViewport
                        };

                        page.render(renderContext).promise.then(function() {
                            saveCanvasState(); // Save state after PDF import
                            redrawCanvas(); // Apply current zoom level
                            console.log('PDF rendering complete at 1:1 scale.');
                        }).catch(function(error) {
                            console.error('Error rendering PDF page:', error);
                            alert('Error rendering PDF page: ' + error.message);
                        });
                    }).catch(function(error) {
                        console.error('Error getting PDF page:', error);
                        alert('Error getting PDF page: ' + error.message);
                    });
                }).catch(function(error) {
                    console.error('Error loading PDF document:', error);
                    alert('Error loading PDF document: ' + error.message);
                });
            };
            fileReader.readAsArrayBuffer(file);
        } else if (file.type === 'image/svg+xml') {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    // Use 1:1 scale for SVG to match drawing scale
                    const x = (canvas.width - img.width) / 2;
                    const y = (canvas.height - img.height) / 2;

                    ctx.drawImage(img, x, y, img.width, img.height);
                    saveCanvasState(); // Save state after SVG import
                    redrawCanvas(); // Apply current zoom level
                    console.log('SVG rendering complete at 1:1 scale.');
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            alert('Unsupported file type. Please import a PDF or SVG file.');
        }
    }
});