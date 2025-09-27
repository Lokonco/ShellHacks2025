import {app, BrowserWindow, ipcMain, session} from 'electron';
import {join} from 'path';

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  if (process.env.NODE_ENV === 'development') {
    const rendererPort = process.argv[2];
    mainWindow.loadURL(`http://localhost:${rendererPort}`);
  }
  else {
    mainWindow.loadFile(join(app.getAppPath(), 'renderer', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Allow PyScript assets to be loaded in the Content-Security-Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' https://pyscript.net https://cdn.jsdelivr.net" + " 'wasm-unsafe-eval'",
      "style-src 'self' " + "'unsafe-inline' " + "https://pyscript.net",
      "connect-src 'self' https://pyscript.net https://cdn.jsdelivr.net" + " ws:",
      "worker-src 'self' blob:"
    ].join('; ');

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
});

ipcMain.on('message', (event, message) => {
  console.log(message);
})