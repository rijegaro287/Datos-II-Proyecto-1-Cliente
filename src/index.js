const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

let ventanaPrincipal;
let plantillaMenu;

if (process.env.NODE_ENV !== 'production') {
    require('electron-reload')(__dirname, {
        electron: path.join(__dirname, '../node_modules', '.bin', 'electron')
    });

    plantillaMenu = [{
        label: 'DevTools',
        submenu: [{
                label: 'Show DevTools',
                accelerator: 'Ctrl + Shift + I',
                click(item, focusedWindow) { focusedWindow.toggleDevTools() }
            },
            {
                role: 'reload',
                accelerator: 'F5',
            }
        ]
    }];
}

app.on('ready', () => {
    ventanaPrincipal = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            contextIsolation: false
        }
    });
    ventanaPrincipal.maximize();
    ventanaPrincipal.loadURL(`file://${__dirname}/views/index.html`);

    const menuVentanaPrincipal = Menu.buildFromTemplate(plantillaMenu);
    Menu.setApplicationMenu(menuVentanaPrincipal);

    ventanaPrincipal.on('closed', () => { app.quit() });
});