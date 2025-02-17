const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs-extra");
const os = require("os");
const { exec } = require("child_process");
const axios = require("axios");
const app = express();
const PORT = 2354;

app.use(express.json());
app.use(cors({
    origin: "*",  
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

const ICONS_DIR = path.join(__dirname, "public", "icons");
fs.ensureDirSync(ICONS_DIR);
const FRONTEND_DIST = path.join(__dirname, "dist"); 
const DATA_FILE = path.join(__dirname, "applications.json");

app.use(express.static(FRONTEND_DIST));
app.use("/api/icons", express.static(ICONS_DIR));



const DEFAULT_ICON = "https://cdn2.iconfinder.com/data/icons/metro-ui-icon-set/512/Default.png";

const getIconOnline = async (appName) => {
    const apiUrl = `https://simpleicons.org/icons/${appName.toLowerCase().replace(/ /g, '')}.svg`;
    try {
        const response = await axios.get(apiUrl);
        if (response.status === 200) {
            return apiUrl;
        } else {
            return DEFAULT_ICON;
        }
    } catch (error) {
        console.error(`Failed to fetch icon for ${appName}:`);
        return DEFAULT_ICON;
    }
};

const getLaunchCommand = (name, path, args) => {
    const platform = os.platform();
    args = args ? args.trim() : "";

    if (platform === "win32") return `"${path}" ${args}`;
    if (platform === "darwin") return `open -a "${path}" ${args}`;
    if (platform === "linux") return `${path} ${args}`;
    if (platform === "android") return `adb shell am start -n ${path}`;
    return null;
};

function loadApplications() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            const defaultApps = [
                { name: "Google Chrome", path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", params: "google.com" },
                { name: "Notepad", path: "notepad.exe", params: "" }
            ];
            saveApplications(defaultApps);
            return defaultApps;
        }
        return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch (error) {
        console.error("Error loading applications:", error);
        return [];
    }
}

function saveApplications(apps) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(apps, null, 2), "utf8");
    } catch (error) {
        console.error("Error saving applications:", error);
    }
}

app.get("/api/getApps", async (req, res) => {
    const apps = loadApplications();
    const appsWithIcons = await Promise.all(
        apps.map(async (app) => ({
            ...app,
            icon: await getIconOnline(app.name)
        }))
    );
    res.json(appsWithIcons);
});

app.post("/api/addApps", (req, res) => {
    const { name, path, params } = req.body;
    if (!name || !path) return res.status(400).json({ error: "Application name and path are required" });

    const apps = loadApplications();
    if (apps.some(app => app.path === path)) return res.status(400).json({ error: "Application already exists" });

    apps.push({ name, path, params: params || "" });
    saveApplications(apps);
    res.json({ message: "Application added successfully", apps });
});

app.post("/api/removeApp", (req, res) => {
    const { path } = req.body;
    if (!path) return res.status(400).json({ error: "Application path is required" });

    let apps = loadApplications();
    const filteredApps = apps.filter((app) => app.path !== path);
    if (apps.length === filteredApps.length) return res.status(404).json({ error: "Application not found" });

    saveApplications(filteredApps);
    res.json({ message: "Application removed successfully", apps });
});

app.post("/api/launch", (req, res) => {
    let { name, path, args } = req.body;
    if (!path) return res.status(400).json({ error: "Application path is required" });

    const command = getLaunchCommand(name, path, args);
    if (!command) return res.status(500).json({ error: "Unsupported OS" });

    console.log(`Executing: ${command}`);
    exec(command, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: `Failed to launch ${name}: ${error.message}` });
        res.json({ message: `${name} launched successfully!` });
    });
});

app.get("*", (req, res) => res.sendFile(path.join(FRONTEND_DIST, "index.html")));

app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://192.168.x.x:${PORT}`));
