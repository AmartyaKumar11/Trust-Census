# Electron Desktop Application

## Overview

This folder contains the Electron wrapper for the Trust-First Census System. Electron serves **purely as a launcher** - it does NOT contain any business logic, database access, or data processing.

## What Electron Does

✅ **Checks** PostgreSQL availability  
✅ **Starts** backend server  
✅ **Starts** frontend server  
✅ **Opens** desktop window  
✅ **Manages** process lifecycle  

## What Electron Does NOT Do

❌ **NO** business logic  
❌ **NO** database access  
❌ **NO** census data handling  
❌ **NO** authentication bypass  
❌ **NO** new APIs  
❌ **NO** local storage of sensitive data  

## Prerequisites

1. **PostgreSQL must be running** (Electron will check this)
   ```bash
   docker-compose up -d
   ```

2. **Node.js dependencies installed** in root and frontend folders
   ```bash
   npm install
   cd frontend && npm install
   ```

3. **Electron dependencies installed** in this folder
   ```bash
   cd electron
   npm install
   ```

## Running the Desktop App

### Development Mode

From the `electron` folder:
```bash
npm start
```

This will:
1. Check if PostgreSQL is available on port 5433
2. Start the backend server (port 3001)
3. Start the frontend server (port 3000)
4. Open a desktop window

### What Happens on Startup

```
Electron Starts
    ↓
Check PostgreSQL (port 5433)
    ↓
[If NOT available] → Show error dialog → Retry or Exit
    ↓
[If available] → Start Backend (npm run dev)
    ↓
Start Frontend (npm run dev)
    ↓
Wait for frontend to be ready
    ↓
Open BrowserWindow → http://localhost:3000
```

### Shutdown

Closing the Electron window will automatically:
- Stop the frontend server
- Stop the backend server
- Clean up all child processes

## Security

Electron is configured with strict security settings:

```javascript
webPreferences: {
  nodeIntegration: false,      // MANDATORY
  contextIsolation: true,       // MANDATORY
  preload: 'preload.js'        // Intentionally minimal
}
```

- No Node.js APIs exposed to the renderer process
- No IPC channels for data transfer
- All authentication and authorization handled by the web app

## Troubleshooting

### "Database Not Available" Error

**Cause:** PostgreSQL is not running  
**Solution:** 
```bash
docker-compose up -d
```

### Frontend/Backend Won't Start

**Cause:** Dependencies not installed or port conflicts  
**Solutions:**
1. Install dependencies:
   ```bash
   npm install
   cd frontend && npm install
   ```

2. Check for port conflicts (3000, 3001, 5433)
   ```bash
   # Windows
   netstat -ano | findstr "3000"
   netstat -ano | findstr "3001"
   
   # Mac/Linux
   lsof -i :3000
   lsof -i :3001
   ```

### Orphaned Processes

**Cause:** Electron didn't shut down cleanly  
**Solution:**
```bash
# Windows
taskkill /F /IM node.exe

# Mac/Linux
killall node
```

## Architecture

```
Electron (Launcher Only)
├── Checks PostgreSQL availability
├── Spawns Backend Process
│   └── Node.js API (port 3001)
├── Spawns Frontend Process
│   └── Next.js (port 3000)
└── Opens BrowserWindow
    └── Loads http://localhost:3000
```

**All trust logic remains in:**
- Backend API (authentication, RBAC, audit logging)
- Frontend guards (role checks, UI restrictions)

**Electron is never authoritative.**

## Web App Still Works

You can still run the web app independently without Electron:

```bash
# Terminal 1 - Database
docker-compose up -d

# Terminal 2 - Backend
npm run dev

# Terminal 3 - Frontend
cd frontend
npm run dev

# Browser
# Open http://localhost:3000
```

The web app functionality is **completely unchanged**.

## Files

- `main.js` - Main process (launcher)
- `preload.js` - Minimal preload script (intentionally empty)
- `package.json` - Electron dependencies
- `README.md` - This file

## Future Enhancements (Not Implemented)

- Build scripts for distribution (electron-builder)
- Auto-update functionality
- Platform-specific installers
- Code signing

These are intentionally NOT included in the initial implementation to maintain simplicity and security.
