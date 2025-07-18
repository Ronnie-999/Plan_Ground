export function initializeCanvasOperations({ canvas, ctx, drawingModeBtn, eraserModeBtn, undoBtn }) {
    let drawing = false;
    let erasing = false;
    let undoStack = [];

    // Default drawing style
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    function saveCanvasState() {
        undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }

    function redrawCanvas() {
        if (undoStack.length > 0) {
            ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
        }
    }

    function setDrawingMode() {
        drawing = true;
        erasing = false;
        canvas.style.cursor = 'crosshair';
    }

    function setErasingMode() {
        drawing = false;
        erasing = true;
        canvas.style.cursor = 'not-allowed';
    }

    function handleMouseDown(e) {
        if (!drawing && !erasing) return;

        saveCanvasState();
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);
        drawing = true;
    }

    function handleMouseMove(e) {
        if (!drawing) return;

        if (erasing) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 20;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = 2;
        }

        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
    }

    function handleMouseUp() {
        drawing = false;
        ctx.closePath();
        ctx.globalCompositeOperation = 'source-over'; // reset after erasing
    }

    function undo() {
        if (undoStack.length > 0) {
            undoStack.pop(); // remove current state
            redrawCanvas();  // redraw previous
        }
    }

    // Attach event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    drawingModeBtn.addEventListener('click', setDrawingMode);
    eraserModeBtn.addEventListener('click', setErasingMode);
    undoBtn.addEventListener('click', undo);

    return {
        saveCanvasState,
        redrawCanvas,
    };
}
