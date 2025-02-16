const express = require("express");
const path = require("path");
const { spawn } = require("child_process");
const cors = require("cors");
const fs = require("fs-extra");
const os = require("os");
const { exec } = require("child_process");
const app = express();
const PORT = 2354;
const extractIcon = require("extract-file-icon"); 
// Middleware
app.use(express.json());
app.use(cors({
    origin: "*",  // Allow all origins (you can restrict this later)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

const ICONS_DIR = path.join(__dirname, "public", "icons");

// Ensure directory exists
fs.ensureDirSync(ICONS_DIR);

const FRONTEND_DIST = path.join(__dirname, "dist"); // Ensure the correct path
app.use(express.static(FRONTEND_DIST));
// Serve icons
app.use("/api/icons", express.static(ICONS_DIR));
// Storage file for applications
const DATA_FILE = path.join(__dirname, "applications.json");

// Function to extract and save icons
const getIcon = async (appName, appPath) => {
    const iconFile = path.join(ICONS_DIR, `${appName}.png`);
    
    if (fs.existsSync(iconFile)) return `/api/icons/${appName}.png`;

    try {
        const iconBuffer = extractIcon(appPath, 256); // Get 256px icon
        fs.writeFileSync(iconFile, iconBuffer);
        return `/api/icons/${appName}.png`;
    } catch (error) {
        console.error(`Failed to extract icon for ${appName}:`, error);
        return `/api/icons/default.png`; // Default icon if extraction fails
    }
};

// Helper function to get the correct command format for each OS
const getLaunchCommand = (name, path, args) => {
    const platform = os.platform();
    args = args ? args.trim() : "";

    if (platform === "win32") {
        return `"${path}" ${args}`;
    } else if (platform === "darwin") {
        return `open -a "${path}" ${args}`;
    } else if (platform === "linux") {
        return `${path} ${args}`;
    } else if (platform === "android") {
        return `adb shell am start -n ${path}`;
    }
    return null;
};




// Load applications from storage
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

// Save applications to storage
function saveApplications(apps) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(apps, null, 2), "utf8");
    } catch (error) {
        console.error("Error saving applications:", error);
    }
}


// API: Get all applications with icons
app.get("/api/getApps", async (req, res) => {
    const apps = loadApplications();
    const appsWithIcons = await Promise.all(
        apps.map(async (app) => ({
            ...app,
            icon: await getIcon(app.name, app.path),
        }))
    );
    res.json(appsWithIcons);
});

// API: Add a new application
app.post("/api/addApps", (req, res) => {
    const { name, path, params } = req.body;
    if (!name || !path) {
        return res.status(400).json({ error: "Application name and path are required" });
    }

    const apps = loadApplications();

    // Prevent duplicate entries
    if (apps.some(app => app.path === path)) {
        return res.status(400).json({ error: "Application already exists" });
    }

    apps.push({ name, path, params: params || "" });
    saveApplications(apps);
    res.json({ message: "Application added successfully", apps });
});

// API: Remove an application by path
app.post("/api/removeApp", (req, res) => {
    const { path } = req.body;
    if (!path) {
        return res.status(400).json({ error: "Application path is required" });
    }

    let apps = loadApplications();
    const filteredApps = apps.filter((app) => app.path !== path);

    if (apps.length === filteredApps.length) {
        return res.status(404).json({ error: "Application not found" });
    }

    saveApplications(filteredApps);
    res.json({ message: "Application removed successfully", apps });
});

// API: Launch an application
app.post("/api/launch", (req, res) => {
    let { name, path, args } = req.body;

    if (!path) {
        return res.status(400).json({ error: "Application path is required" });
    }

    const command = getLaunchCommand(name, path, args);
    if (!command) {
        return res.status(500).json({ error: "Unsupported OS" });
    }

    console.log(`Executing: ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error launching ${name}:`, error);
            return res.status(500).json({ error: `Failed to launch ${name}: ${error.message}` });
        }

        console.log(`Output: ${stdout || stderr}`);
        res.json({ message: `${name} launched successfully!` });
    });
});


// Catch-all route for SPA (React)
app.get("*", (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
});

// Start server
app.listen(PORT, "localhost", () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
