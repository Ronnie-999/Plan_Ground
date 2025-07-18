// basicop.js - Basic Operations Module
// Handles drawing, erasing, and undo functionality

export class BasicOperations {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.isDrawing = false;
        this.isDrawingMode = false;
        this.isEraserMode = false;
        this.eraserSize = 20;
        this.undoStack = [];
        this.lastX = 0;
        this.lastY = 0;
        
        // Initialize drawing context
        this.initializeDrawingContext();
    }

    // Initialize drawing context with default settings
    initializeDrawingContext() {
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
    }

    // Function to save canvas state for undo functionality
    saveCanvasState() {
        this.undoStack.push(this.canvas.toDataURL());
        if (this.undoStack.length > 50) {
            this.undoStack.shift();
        }
        console.log('Canvas state saved. Undo stack length:', this.undoStack.length);
    }

    // Function to clear undo stack
    clearUndoStack() {
        this.undoStack.length = 0;
        this.saveCanvasState();
    }

    // Get the current undo stack length
    getUndoStackLength() {
        return this.undoStack.length;
    }

    // Update drawing context based on current mode
    updateDrawingContext() {
        this.ctx.strokeStyle = this.isEraserMode ? 'white' : 'black';
        this.ctx.lineWidth = this.isEraserMode ? this.eraserSize : 2;
        this.ctx.lineCap = 'round';
    }

    // Toggle drawing mode
    toggleDrawingMode() {
        this.isDrawingMode = !this.isDrawingMode;
        if (this.isDrawingMode) {
            this.isEraserMode = false;
        }
        this.updateDrawingContext();
        console.log('Drawing mode:', this.isDrawingMode ? 'enabled' : 'disabled');
        return this.isDrawingMode;
    }

    // Toggle eraser mode
    toggleEraserMode() {
        this.isEraserMode = !this.isEraserMode;
        if (this.isEraserMode) {
            this.isDrawingMode = false;
        }
        this.updateDrawingContext();
        console.log('Eraser mode:', this.isEraserMode ? 'enabled' : 'disabled');
        return this.isEraserMode;
    }

    // Start drawing/erasing operation
    startDrawing(x, y, getTransformState) {
        if (this.isDrawingMode || this.isEraserMode) {
            this.isDrawing = true;
            
            const { zoomLevel, panX, panY } = getTransformState();
            this.lastX = (x - panX) / zoomLevel;
            this.lastY = (y - panY) / zoomLevel;
            
            this.ctx.save();
            this.ctx.scale(zoomLevel, zoomLevel);
            this.ctx.translate(panX, panY);
            this.updateDrawingContext();
            this.ctx.beginPath();
            this.ctx.moveTo(this.lastX, this.lastY);
            
            console.log(this.isEraserMode ? 'Started erasing at:' : 'Started drawing at:', this.lastX, this.lastY);
            return true;
        }
        return false;
    }

    // Continue drawing/erasing operation
    continueDrawing(x, y, getTransformState) {
        if (this.isDrawing && (this.isDrawingMode || this.isEraserMode)) {
            const { zoomLevel, panX, panY } = getTransformState();
            const currentX = (x - panX) / zoomLevel;
            const currentY = (y - panY) / zoomLevel;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.lastX, this.lastY);
            this.ctx.lineTo(currentX, currentY);
            this.ctx.stroke();
            
            this.lastX = currentX;
            this.lastY = currentY;
            return true;
        }
        return false;
    }

    // End drawing/erasing operation
    endDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.ctx.restore();
            this.saveCanvasState();
            console.log('Stroke completed, saved canvas state');
            return true;
        }
        return false;
    }

    // Undo last operation
    undo(redrawCallback) {
        if (this.undoStack.length > 1) {
            this.undoStack.pop(); // Remove current state
            if (redrawCallback) {
                redrawCallback(); // Redraw previous state
            }
            console.log('Undo successful. Undo stack length:', this.undoStack.length);
            return true;
        } else if (this.undoStack.length === 1) {
            // If only one state left, clear canvas and stack
            this.undoStack.pop();
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.saveCanvasState(); // Save empty state
            console.log('Canvas cleared. Undo stack length:', this.undoStack.length);
            return true;
        }
        return false;
    }

    // Redraw canvas from undo stack
    redrawCanvas(getTransformState) {
        if (this.undoStack.length > 0) {
            const currentState = this.undoStack[this.undoStack.length - 1];
            const img = new Image();
            img.onload = () => {
                this.ctx.save();
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                if (getTransformState) {
                    const { zoomLevel, panX, panY } = getTransformState();
                    this.ctx.translate(panX, panY);
                    this.ctx.scale(zoomLevel, zoomLevel);
                }
                
                this.ctx.drawImage(img, 0, 0);
                this.ctx.restore();
            };
            img.src = currentState;
        }
    }

    // Get current drawing state
    getDrawingState() {
        return {
            isDrawing: this.isDrawing,
            isDrawingMode: this.isDrawingMode,
            isEraserMode: this.isEraserMode,
            eraserSize: this.eraserSize,
            undoStackLength: this.undoStack.length
        };
    }

    // Set eraser size
    setEraserSize(size) {
        this.eraserSize = size;
        if (this.isEraserMode) {
            this.updateDrawingContext();
        }
    }

    // Initialize with saved state (for canvas resize)
    initializeWithState() {
        if (this.undoStack.length === 0) {
            this.saveCanvasState();
        }
    }
}