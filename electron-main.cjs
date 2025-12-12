const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        backgroundColor: '#1a1a1a',
        icon: path.join(__dirname, 'build', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'electron-preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
        },
        show: false, // Don't show until ready
        frame: true,
        titleBarStyle: 'default',
    });

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Load the app
    if (isDev) {
        // Development mode - load from Vite dev server
        mainWindow.loadURL('http://localhost:8080');
        // Open DevTools in development
        mainWindow.webContents.openDevTools();
    } else {
        // Production mode - load from built files
        const url = require('url').format({
            protocol: 'file',
            slashes: true,
            pathname: path.join(__dirname, 'dist', 'index.html')
        });
        mainWindow.loadURL(url);
        // Temporarily enable DevTools to debug
        mainWindow.webContents.openDevTools();
    }

    // Handle window close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle external links (open in default browser)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });
}

// App lifecycle
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        // On macOS, re-create window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Security: Prevent navigation to external sites
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);

        // Allow localhost in development
        if (isDev && parsedUrl.origin === 'http://localhost:8080') {
            return;
        }

        // Prevent navigation to external sites
        if (parsedUrl.origin !== 'file://') {
            event.preventDefault();
        }
    });
});

// IPC Handlers - Add your custom handlers here
ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
});

ipcMain.handle('app:getPlatform', () => {
    return process.platform;
});

// Printer support
ipcMain.handle('printer:getPrinters', async () => {
    const { webContents } = mainWindow;
    return await webContents.getPrintersAsync();
});

ipcMain.handle('printer:print', async (event, options) => {
    const { webContents } = mainWindow;
    return new Promise((resolve, reject) => {
        webContents.print(options, (success, errorType) => {
            if (success) {
                resolve(true);
            } else {
                reject(new Error(errorType));
            }
        });
    });
});
