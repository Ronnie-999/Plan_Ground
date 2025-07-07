// canvas_transform.js

let zoomLevel = 1;
let panX = 0;
let panY = 0;
const minZoom = 0.1;
const maxZoom = 5;

export function getTransformState() {
    return { zoomLevel, panX, panY };
}

export function setTransformState(newZoomLevel, newPanX, newPanY) {
    zoomLevel = newZoomLevel;
    panX = newPanX;
    panY = newPanY;
}

export function applyZoom(delta, canvas, ctx, redrawCanvas) {
    const oldZoom = zoomLevel;
    zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel * (1 + delta)));

    // Adjust pan to zoom into the center of the canvas
    const zoomFactor = zoomLevel / oldZoom;
    panX = (panX + canvas.width / 2) * zoomFactor - canvas.width / 2;
    panY = (panY + canvas.height / 2) * zoomFactor - canvas.height / 2;

    redrawCanvas();
}

let isPanning = false;
let lastX = 0;
let lastY = 0;

export function handlePanning(canvas, ctx, redrawCanvas) {

    canvas.addEventListener('mousedown', function(e) {
        if (e.buttons === 2 && e.ctrlKey) { // Right mouse button + Ctrl key
            isPanning = true;
            lastX = e.clientX;
            lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
            e.preventDefault(); // Prevent context menu
        }
    });

    canvas.addEventListener('mousemove', function(e) {
        if (isPanning) {
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            panX += dx;
            panY += dy;
            lastX = e.clientX;
            lastY = e.clientY;
            redrawCanvas();
        }
    });

    canvas.addEventListener('mouseup', function(e) {
        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = 'default';
        }
    });

    canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault(); // Prevent context menu on right-click
    });
}