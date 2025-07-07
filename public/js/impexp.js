// FileImportManager - Module for handling file imports
window.FileImportManager = (function() {
    'use strict';
    
    console.log('FileImportManager module loading...');
    
    function FileImportManager(canvas, ctx, saveCanvasStateCallback, redrawCanvasCallback, clearUndoStackCallback) {
        console.log('FileImportManager constructor called');
        this.canvas = canvas;
        this.ctx = ctx;
        this.saveCanvasState = saveCanvasStateCallback;
        this.redrawCanvas = redrawCanvasCallback;
        this.clearUndoStack = clearUndoStackCallback;
        
        // Configure PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            console.log('PDF.js configured');
        } else {
            console.warn('PDF.js not loaded');
        }
    }

    // Function to clear the canvas
    FileImportManager.prototype.clearCanvas = function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.clearUndoStack) {
            this.clearUndoStack();
        }
    };

    // Function to handle file import
    FileImportManager.prototype.handleFileImport = function(file) {
        console.log('handleFileImport called with file:', file.name, file.type);
        
        if (file.type === 'application/pdf') {
            this.handlePDFImport(file);
        } else if (file.type === 'image/svg+xml') {
            this.handleSVGImport(file);
        } else if (file.type.startsWith('image/')) {
            this.handleImageImport(file);
        } else {
            alert('Unsupported file type. Please import a PDF, SVG, or image file.');
        }
    };

    // Handle PDF file import
    FileImportManager.prototype.handlePDFImport = function(file) {
        const self = this;
        const fileReader = new FileReader();
        
        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);
            console.log('Attempting to load PDF document...');
            
            pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                console.log('PDF document loaded successfully.');
                return pdf.getPage(1);
            }).then(function(page) {
                const viewport = page.getViewport({ scale: 1 });
                
                // Calculate scale to fit the canvas
                const canvasWidth = self.canvas.width;
                const canvasHeight = self.canvas.height;
                const scaleX = canvasWidth / viewport.width;
                const scaleY = canvasHeight / viewport.height;
                const scale = Math.min(scaleX, scaleY, 1); // Don't scale up
                
                const scaledViewport = page.getViewport({ scale: scale });

                // Calculate position to center the PDF
                const x = (canvasWidth - scaledViewport.width) / 2;
                const y = (canvasHeight - scaledViewport.height) / 2;

                // Clear canvas first
                self.ctx.clearRect(0, 0, canvasWidth, canvasHeight);

                // Create temporary canvas for PDF rendering
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = scaledViewport.width;
                tempCanvas.height = scaledViewport.height;

                const renderContext = {
                    canvasContext: tempCtx,
                    viewport: scaledViewport
                };

                return page.render(renderContext).promise.then(function() {
                    // Draw the rendered PDF onto the main canvas
                    self.ctx.drawImage(tempCanvas, x, y);
                    self.saveCanvasState();
                    console.log('PDF rendering complete.');
                });
            }).catch(function(error) {
                console.error('Error processing PDF:', error);
                alert('Error processing PDF: ' + error.message);
            });
        };
        
        fileReader.onerror = function() {
            console.error('Error reading PDF file');
            alert('Error reading PDF file');
        };
        
        fileReader.readAsArrayBuffer(file);
    };

    // Handle SVG file import
    FileImportManager.prototype.handleSVGImport = function(file) {
        const self = this;
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // Calculate scale to fit the canvas
                const canvasWidth = self.canvas.width;
                const canvasHeight = self.canvas.height;
                const scaleX = canvasWidth / img.width;
                const scaleY = canvasHeight / img.height;
                const scale = Math.min(scaleX, scaleY, 1); // Don't scale up
                
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                
                const x = (canvasWidth - scaledWidth) / 2;
                const y = (canvasHeight - scaledHeight) / 2;

                // Clear canvas first
                self.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                self.ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                self.saveCanvasState();
                console.log('SVG rendering complete.');
            };
            
            img.onerror = function() {
                console.error('Error loading SVG image');
                alert('Error loading SVG image');
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            console.error('Error reading SVG file');
            alert('Error reading SVG file');
        };
        
        reader.readAsDataURL(file);
    };

    // Handle regular image file import
    FileImportManager.prototype.handleImageImport = function(file) {
        const self = this;
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // Calculate scale to fit the canvas
                const canvasWidth = self.canvas.width;
                const canvasHeight = self.canvas.height;
                const scaleX = canvasWidth / img.width;
                const scaleY = canvasHeight / img.height;
                const scale = Math.min(scaleX, scaleY, 1); // Don't scale up
                
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                
                const x = (canvasWidth - scaledWidth) / 2;
                const y = (canvasHeight - scaledHeight) / 2;

                // Clear canvas first
                self.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                self.ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                self.saveCanvasState();
                console.log('Image rendering complete.');
            };
            
            img.onerror = function() {
                console.error('Error loading image');
                alert('Error loading image');
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            console.error('Error reading image file');
            alert('Error reading image file');
        };
        
        reader.readAsDataURL(file);
    };

    // Setup file input handlers
    FileImportManager.prototype.setupFileInputHandlers = function(importButton, fileInput) {
        const self = this;
        
        // Import button click handler
        importButton.addEventListener('click', function() {
            console.log('Import button clicked');
            fileInput.click();
        });

        // File input change handler
        fileInput.addEventListener('change', function(e) {
            console.log('File input changed');
            const file = e.target.files[0];
            if (file) {
                console.log('Selected file:', file.name, file.type);
                self.handleFileImport(file);
            }
            // Reset file input
            e.target.value = '';
        });
    };

    console.log('FileImportManager module loaded successfully');
    return FileImportManager;
})();