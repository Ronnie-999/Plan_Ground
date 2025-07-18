// Main application script - Modularized version
pdfjsLib.GlobalWorkerOptions.workerSrc = './public/js/pdf.worker.min.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing application...');
    console.log('DOMContentLoaded event fired in script.js');

    // Import canvas transformation functions
    let getTransformState, setTransformState, applyZoom, handlePanning;

    // Basic operations instance
    let basicOps;

    async function initializeCanvasTransform() {
        const module = await import('./canvas_transform.js');
        getTransformState = module.getTransformState;
        setTransformState = module.setTransformState;
        applyZoom = module.applyZoom;
        handlePanning = module.handlePanning;

        // Initialize transform state
        setTransformState(1, 0, 0);
        
        // Initialize panning functionality
        handlePanning(canvas, ctx, () => basicOps.redrawCanvas(getTransformState));

        // Zoom functionality
        canvas.addEventListener('wheel', function(e) {
            e.preventDefault();
            const delta = e.deltaY * -0.001; // Adjust zoom speed
            applyZoom(delta, canvas, ctx, () => basicOps.redrawCanvas(getTransformState));
        });
    }

    async function initializeBasicOperations() {
        const module = await import('./basicop.js');
        basicOps = new module.BasicOperations(canvas, ctx);
    }

    // DOM elements
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

    let isResizing = false;

    // Initialize file import manager
    function initializeFileImport() {
        if (window.FileImportManager) {
            const fileImportManager = new window.FileImportManager(
                canvas, 
                ctx, 
                () => basicOps.saveCanvasState(), 
                () => basicOps.redrawCanvas(getTransformState),
                () => basicOps.clearUndoStack()
            );
            
            // Setup file input handlers
            fileImportManager.setupFileInputHandlers(importButton, fileInput);
            console.log('File import manager initialized');
        } else {
            console.error('FileImportManager not found');
        }
    }

    // Set canvas size to match its display size
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Reinitialize drawing context after resize
        if (basicOps) {
            basicOps.initializeDrawingContext();
            basicOps.initializeWithState();
            basicOps.redrawCanvas(getTransformState);
        }
    }

    // Initial setup
    async function initialize() {
        await initializeBasicOperations();
        await initializeCanvasTransform();
        
        // Initial resize
        resizeCanvas();
        
        // Initialize file import
        initializeFileImport();
        
        // Setup event listeners
        setupEventListeners();
    }

    // Setup all event listeners
    function setupEventListeners() {
        // Drawing mode button
        drawingModeBtn.addEventListener('click', function() {
            const isActive = basicOps.toggleDrawingMode();
            drawingModeBtn.classList.toggle('active', isActive);
            eraserModeBtn.classList.toggle('active', false);
            canvas.style.cursor = isActive ? 'crosshair' : 'default';
        });

        // Eraser mode button
        eraserModeBtn.addEventListener('click', function() {
            const isActive = basicOps.toggleEraserMode();
            eraserModeBtn.classList.toggle('active', isActive);
            drawingModeBtn.classList.toggle('active', false);
            canvas.style.cursor = isActive ? 'cell' : 'default';
        });

        // Undo button
        undoBtn.addEventListener('click', function() {
            basicOps.undo(() => basicOps.redrawCanvas(getTransformState));
        });

        // Canvas mouse events
        canvas.addEventListener('mousedown', function(e) {
            if (e.button === 0) { // Left mouse button
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                basicOps.startDrawing(mouseX, mouseY, getTransformState);
            }
        });

        canvas.addEventListener('mousemove', function(e) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            basicOps.continueDrawing(mouseX, mouseY, getTransformState);
        });

        canvas.addEventListener('mouseup', function() {
            basicOps.endDrawing();
        });

        canvas.addEventListener('mouseleave', function() {
            basicOps.endDrawing();
        });

        // Resize canvas when window is resized
        window.addEventListener('resize', function() {
            setTimeout(resizeCanvas, 100);
        });

        // Sidebar resize functionality
        setupSidebarResize();
        
        // Theme functionality
        setupThemeToggle();
    }

    // Sidebar resize functionality
    function setupSidebarResize() {
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
    }

    // Theme toggle functionality
    function setupThemeToggle() {
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
    }

    // Initialize the application
    initialize();
});