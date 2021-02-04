const path = require("path");
const os = require("os");
// app manages the entire lifecycle of the application.
// BrowserWindow creates desktop windows.
const {
  app,
  BrowserWindow,
  Menu,
  globalShortcut,
  ipcMain,
  shell,
} = require("electron");
const imagemin = require("imagemin");
const imageminMozJpeg = require("imagemin-mozjpeg");
const imageminPngQuant = require("imagemin-pngquant");
const slash = require("slash");
const log = require("electron-log");

process.env.NODE_ENV = "production";

const isDev = process.env.NODE_ENV !== "production" ? true : false;
const isLinux = process.platform === "linux";

let mainWindow;
let aboutWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: "Image Shrink",
    width: 500,
    height: 600,
    icon: "./assets/icons/Icon_256x256.png",
    resizable: isDev,
    backgroundColor: "white",
    webPreferences: {
      nodeIntegration: true,
    },
  });

  // load a file into the browser window.
  mainWindow.loadFile("./app/index.html");
}

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    title: "About Image Shrink",
    width: 300,
    height: 300,
    icon: "./assets/icons/Icon_256x256.png",
    resizable: false,
    backgroundColor: "white",
    webPreferences: {
      nodeIntegration: true,
    },
  });

  // load a file into the browser window.
  aboutWindow.loadFile("./app/about.html");
}

// event handling.
app.on("ready", () => {
  createMainWindow();
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  // Shortcuts are only necessay in development mode and they have already been added below.
  //   globalShortcut.register("CmdOrCtrl+R", () => mainWindow.reload());
  //   globalShortcut.register(isLinux ? "Ctrl+Shift+I" : "Command+Alt+I", () =>
  //     mainWindow.toggleDevTools()
  //   );
  mainWindow.on("closed", () => (mainWindow = null));
});

const menu = [
  ...(process.platform === "darwin"
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  {
    role: "fileMenu",
  },
  ...(isLinux
    ? [
        {
          label: "Help",
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  ...(isDev
    ? [
        {
          label: "Developer",
          submenu: [
            { role: "reload" },
            { role: "forcereload" },
            { type: "separator" },
            { role: "toggledevtools" },
          ],
        },
      ]
    : []),
];

ipcMain.on("image:minimize", (e, options) => {
  options.dest = path.join(os.homedir(), "imageshrink");
  console.log(options);
  shrinkImage(options);
});

async function shrinkImage({ imgPath, quality, dest }) {
  try {
    const pngQuality = quality / 100;
    const files = await imagemin([slash(imgPath)], {
      destination: dest,
      plugins: [
        imageminMozJpeg({ quality }),
        imageminPngQuant({
          quality: [pngQuality, pngQuality],
        }),
      ],
    });

    log.info(files);
    shell.openPath(dest);
    mainWindow.webContents.send("image:done");
  } catch (err) {
    log.error(err);
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
