// Improved and Refined Drawing Tool Code

// Wait for the DOM to fully load
document.addEventListener('DOMContentLoaded', () => {
    // DOM element references
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

    // State variables
    let isDrawing = false;
    let isDrawingMode = false;
    let isEraserMode = false;
    let lastX = 0, lastY = 0;
    let isResizing = false;
    const eraserSize = 20;
    const undoStack = [];

    // Save initial state
    saveCanvasState();

    // Sidebar resizing
    resizeHandle.addEventListener('mousedown', e => {
        isResizing = true;
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    });

    function handleResize(e) {
        if (!isResizing) return;
        const newWidth = e.clientX;
        if (newWidth >= 50 && newWidth <= 300) {
            container.style.gridTemplateColumns = `${newWidth}px 1fr`;
            resizeCanvas();
        }
    }

    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    }

    // Set up canvas size and resize handling
    function resizeCanvas() {
        const tempImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx.putImageData(tempImage, 0, 0);
        configureContext();
    }

    function configureContext() {
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Mode toggle buttons
    drawingModeBtn.addEventListener('click', () => {
        isDrawingMode = !isDrawingMode;
        if (isDrawingMode) {
            isEraserMode = false;
            eraserModeBtn.classList.remove('active');
        }
        drawingModeBtn.classList.toggle('active');
        canvas.style.cursor = isDrawingMode ? 'crosshair' : 'default';
        configureContext();
    });

    eraserModeBtn.addEventListener('click', () => {
        isEraserMode = !isEraserMode;
        if (isEraserMode) {
            isDrawingMode = false;
            drawingModeBtn.classList.remove('active');
        }
        eraserModeBtn.classList.toggle('active');
        canvas.style.cursor = isEraserMode ? 'cell' : 'default';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = eraserSize;
    });

    // Drawing logic
    canvas.addEventListener('mousedown', e => {
        if (e.button === 0 && (isDrawingMode || isEraserMode)) {
            isDrawing = true;
            [lastX, lastY] = [e.offsetX, e.offsetY];
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            saveCanvasState();
        }
    });

    canvas.addEventListener('mousemove', e => {
        if (isDrawing && (isDrawingMode || isEraserMode)) {
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
            [lastX, lastY] = [e.offsetX, e.offsetY];
        }
    });

    ['mouseup', 'mouseleave'].forEach(event => {
        canvas.addEventListener(event, () => {
            if (isDrawing) {
                isDrawing = false;
                saveCanvasState();
            }
        });
    });

    function saveCanvasState() {
        undoStack.push(canvas.toDataURL());
        if (undoStack.length > 50) undoStack.shift();
    }

    undoBtn.addEventListener('click', () => {
        if (undoStack.length > 1) {
            undoStack.pop();
            const img = new Image();
            img.src = undoStack[undoStack.length - 1];
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
        }
    });

    // Import functionality
    importButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) handleFileImport(file);
    });

    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        undoStack.length = 0;
        saveCanvasState();
    }

    function handleFileImport(file) {
        clearCanvas();

        if (file.type === 'application/pdf') {
            const fileReader = new FileReader();
            fileReader.onload = function() {
                const typedarray = new Uint8Array(this.result);
                pdfjsLib.getDocument(typedarray).promise
                    .then(pdf => pdf.getPage(1))
                    .then(page => {
                        const viewport = page.getViewport({ scale: 1 });
                        const scale = Math.min(canvas.width / viewport.width, canvas.height / viewport.height);
                        const scaledViewport = page.getViewport({ scale });
                        const x = (canvas.width - scaledViewport.width) / 2;
                        const y = (canvas.height - scaledViewport.height) / 2;

                        const renderContext = {
                            canvasContext: ctx,
                            viewport: scaledViewport,
                            transform: [
                                scaledViewport.scale, 0,
                                0, -scaledViewport.scale,
                                x, canvas.height - y
                            ]
                        };

                        return page.render(renderContext).promise;
                    })
                    .then(() => saveCanvasState())
                    .catch(error => alert('PDF error: ' + error.message));
            };
            fileReader.readAsArrayBuffer(file);

        } else if (file.type === 'image/svg+xml') {
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                    const scaledWidth = img.width * scale;
                    const scaledHeight = img.height * scale;
                    const x = (canvas.width - scaledWidth) / 2;
                    const y = (canvas.height - scaledHeight) / 2;

                    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                    saveCanvasState();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);

        } else {
            alert('Unsupported file type. Please import a PDF or SVG.');
        }
    }
});
