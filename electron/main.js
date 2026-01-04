/**
 * Electron Main Process
 * Trust-First Census System - Desktop Launcher
 * 
 * RESPONSIBILITY: Launch backend and frontend servers, open desktop window
 * 
 * MUST:
 * - Start backend and frontend as child processes
 * - Check PostgreSQL availability before starting
 * - Open BrowserWindow with strict security settings
 * - Kill child processes on exit
 * 
 * MUST NEVER:
 * - Contain business logic
 * - Access database directly
 * - Handle census data
 * - Bypass authentication
 * - Expose Node.js APIs to renderer
 */

const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

// Configuration
const FRONTEND_PORT = 3000;
const BACKEND_PORT = 3001;
const DATABASE_PORT = 5433;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

// Child processes
let backendProcess = null;
let frontendProcess = null;

/**
 * Check if a port is available (service is running)
 */
function checkPort(port, host = '127.0.0.1') {
    return new Promise((resolve) => {
        const socket = new net.Socket();

        socket.setTimeout(2000);

        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });

        socket.on('error', () => {
            resolve(false);
        });

        socket.connect(port, host);
    });
}

/**
 * Check if PostgreSQL is running
 */
async function checkDatabase() {
    const isAvailable = await checkPort(DATABASE_PORT);

    if (!isAvailable) {
        const result = await dialog.showMessageBox({
            type: 'error',
            title: 'Database Not Available',
            message: 'PostgreSQL database is not running',
            detail: `Please start the database first:\n\ndocker-compose up -d\n\nThe database should be available on port ${DATABASE_PORT}.`,
            buttons: ['Exit', 'Retry'],
            defaultId: 1
        });

        if (result.response === 0) {
            // User chose Exit
            app.quit();
            return false;
        } else {
            // User chose Retry
            return checkDatabase();
        }
    }

    return true;
}

/**
 * Wait for frontend to become available
 */
async function waitForFrontend(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
        const isAvailable = await checkPort(FRONTEND_PORT);
        if (isAvailable) {
            console.log('Frontend is ready');
            return true;
        }
        console.log(`Waiting for frontend... (${i + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
}

/**
 * Get the correct paths for resources based on whether app is packaged
 */
function getResourcePaths() {
    const isDev = !app.isPackaged;

    if (isDev) {
        // Development mode
        return {
            rootDir: path.join(__dirname, '..'),
            frontendDir: path.join(__dirname, '../frontend'),
            backendEntry: path.join(__dirname, '../src/server.js'),
            frontendEntry: path.join(__dirname, '../frontend/.next/standalone/server.js')
        };
    } else {
        // Production mode (packaged)
        const resourcesPath = process.resourcesPath;
        return {
            rootDir: path.join(resourcesPath, 'app'),
            frontendDir: path.join(resourcesPath, 'app/frontend'),
            backendEntry: path.join(resourcesPath, 'app/backend/src/server.js'),
            frontendEntry: path.join(resourcesPath, 'app/frontend/server.js')
        };
    }
}

/**
 * Start backend server
 */
function startBackend() {
    console.log('Starting backend server...');

    const isDev = !app.isPackaged;
    const paths = getResourcePaths();

    if (isDev) {
        // Development mode - use npm
        backendProcess = spawn('npm', ['run', 'dev'], {
            cwd: paths.rootDir,
            env: process.env,
            stdio: 'inherit',
            shell: true
        });
    } else {
        // Production mode - direct Node execution
        backendProcess = spawn(process.execPath, [paths.backendEntry], {
            cwd: paths.rootDir,
            env: process.env,
            stdio: 'inherit'
        });
    }

    backendProcess.on('error', (err) => {
        console.error('Failed to start backend:', err);
        dialog.showErrorBox(
            'Backend Startup Error',
            `Failed to start backend server: ${err.message}`
        );
    });

    backendProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
    });
}

/**
 * Start frontend server
 */
function startFrontend() {
    console.log('Starting frontend server...');

    const isDev = !app.isPackaged;
    const paths = getResourcePaths();

    if (isDev) {
        // Development mode - use npm
        frontendProcess = spawn('npm', ['run', 'dev'], {
            cwd: paths.frontendDir,
            env: process.env,
            stdio: 'inherit',
            shell: true
        });
    } else {
        // Production mode - use Next.js standalone server
        frontendProcess = spawn(process.execPath, [paths.frontendEntry], {
            cwd: paths.frontendDir,
            env: {
                ...process.env,
                PORT: String(FRONTEND_PORT)
            },
            stdio: 'inherit'
        });
    }

    frontendProcess.on('error', (err) => {
        console.error('Failed to start frontend:', err);
        dialog.showErrorBox(
            'Frontend Startup Error',
            `Failed to start frontend server: ${err.message}`
        );
    });

    frontendProcess.on('close', (code) => {
        console.log(`Frontend process exited with code ${code}`);
    });
}

/**
 * Create main application window
 */
function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            // SECURITY: These settings are MANDATORY
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        title: 'Trust-First Census System',
        backgroundColor: '#f8f5f0'
    });

    mainWindow.loadURL(FRONTEND_URL);

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        // Window closed
    });
}

/**
 * Kill child processes
 */
function killProcesses() {
    console.log('Shutting down child processes...');

    if (backendProcess) {
        backendProcess.kill();
        backendProcess = null;
    }

    if (frontendProcess) {
        frontendProcess.kill();
        frontendProcess = null;
    }
}

/**
 * Main initialization
 */
async function initialize() {
    // 1. Check database availability
    console.log('Checking database availability...');
    const dbAvailable = await checkDatabase();
    if (!dbAvailable) {
        return;
    }

    // 2. Start backend
    startBackend();

    // Wait a bit for backend to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Start frontend
    startFrontend();

    // 4. Wait for frontend to be ready
    console.log('Waiting for frontend to start...');
    const frontendReady = await waitForFrontend();

    if (!frontendReady) {
        dialog.showErrorBox(
            'Startup Failed',
            'Frontend server did not start in time. Please check the console for errors.'
        );
        app.quit();
        return;
    }

    // 5. Create window
    createWindow();
}

// App lifecycle
app.whenReady().then(initialize);

app.on('window-all-closed', () => {
    // On macOS, apps typically stay active until Cmd+Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    killProcesses();
});

// Handle crashes and errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
