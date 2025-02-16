const express = require("express");
const path = require("path");
const { spawn } = require("child_process");
const cors = require("cors");
const fs = require("fs-extra");

const app = express();
const PORT = 2354;

// Middleware
app.use(express.json());
app.use(cors());

app.use(cors({
    origin: "*",  // Allow all origins (you can restrict this later)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  }));

const FRONTEND_DIST = path.join(__dirname, "dist"); // Ensure the correct path
app.use(express.static(FRONTEND_DIST));

// Storage file for applications
const DATA_FILE = path.join(__dirname, "applications.json");

// Load applications from storage
function loadApplications() {
    if (!fs.existsSync(DATA_FILE)) {
        const defaultApps = [
            { name: "Google Chrome", path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", params: "google.com" },
            { name: "Notepad", path: "notepad.exe", params: "" }
        ];
        saveApplications(defaultApps);
        return defaultApps;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

// Save applications to storage
function saveApplications(apps) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(apps, null, 2), "utf8");
}

// API: Get all applications
app.get("/api/getApps", (req, res) => {  // ✅ Fixed missing `/`
    res.json(loadApplications());
});

// API: Add a new application
app.post("/api/addApps", (req, res) => { // ✅ Fixed missing `/`
    const { name, path, params } = req.body;
    if (!name || !path) {
        return res.status(400).json({ error: "Application name and path are required" });
    }
    const apps = loadApplications();
    apps.push({ name, path, params: params || "" });
    saveApplications(apps);
    res.json({ message: "Application added successfully" });
});

// API: Remove an application
app.post("/api/removeApp", (req, res) => { // ✅ Fixed missing `/`
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: "Application name is required" });
    }

    let apps = loadApplications();
    const filteredApps = apps.filter((app) => app.name !== name);

    if (apps.length === filteredApps.length) {
        return res.status(404).json({ error: "Application not found" });
    }

    saveApplications(filteredApps);
    res.json({ message: "Application removed successfully" });
});

// API: Launch an application
app.post("/api/launch", (req, res) => { // ✅ Fixed missing `/`
    const { path, params } = req.body;
    if (!path) {
        return res.status(400).json({ error: "Application path is required" });
    }
    try {
        const process = spawn(path, params ? [params] : [], { detached: true, shell: true });
        process.unref();
        res.json({ message: `Launched ${path} ${params}` });
    } catch (error) {
        res.status(500).json({ error: "Failed to launch application", details: error.message });
    }
});

// // Catch-all route for SPA (React)
app.get("*", (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
});

// Start server
// app.listen(PORT, "0.0.0.0", () => {
//     console.log(`Server running on http://192.168.0.147:${PORT}/`);
// });

app.listen(PORT, "localhost", () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
