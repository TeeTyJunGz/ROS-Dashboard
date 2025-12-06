# Dashboard API Server Setup

## What Changed

Your ROS Dashboard now has a backend API server for import/export instead of using browser-only functionality.

### Files Created
- `server.js` - Express API server with two endpoints:
  - `POST /api/dashboard/export` - Export dashboard as JSON
  - `POST /api/dashboard/import` - Import dashboard from JSON file

### Files Updated
- `package.json` - Added express, cors, multer, concurrently dependencies and new npm scripts
- `src/components/DashboardManager.jsx` - Updated to use API endpoints instead of browser FileReader/blob

## Setup Instructions

### 1. Install Dependencies
Run in PowerShell (might need to bypass execution policy):
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
npm install
```

Or use a standard command prompt instead of PowerShell.

### 2. Run the Server & App Together

**Option A: Run both at the same time (Recommended)**
```
npm run dev:all
```
This starts both:
- Vite dev server on http://localhost:3000 (your React app)
- Express API server on http://localhost:5000 (dashboard API)

**Option B: Run separately in different terminals**

Terminal 1:
```
npm run server
```

Terminal 2:
```
npm run dev
```

### 3. How It Works

When you click Import/Export in Dashboard Manager:
1. React sends HTTP request to `http://localhost:5000/api/dashboard/export` or `/api/dashboard/import`
2. Server validates and processes the file
3. Response is returned as JSON
4. React handles the file download (export) or passes data to onImport callback (import)

### 4. Configuration

If you want to use a different API server URL, set the environment variable:
```
VITE_API_URL=http://your-server:port npm run dev
```

Default is `http://localhost:5000`

### 5. API Endpoints

**Export Dashboard**
```
POST /api/dashboard/export
Content-Type: application/json

{
  "pages": [...],
  "currentPageId": "..."
}

Response:
{
  "pages": [...],
  "currentPageId": "...",
  "exportedAt": "2025-12-04T..."
}
```

**Import Dashboard**
```
POST /api/dashboard/import
Content-Type: multipart/form-data
Body: form file field "file"

Response:
{
  "success": true,
  "data": {
    "pages": [...],
    "currentPageId": "..."
  },
  "message": "Dashboard imported successfully"
}
```

**Health Check**
```
GET /api/health

Response:
{
  "status": "ok",
  "message": "Dashboard API server is running"
}
```

### Troubleshooting

**Error: "API server is not running"**
- Make sure you ran `npm run server` or `npm run dev:all`
- Check that port 5000 is not already in use
- If using different port, set `VITE_API_URL` environment variable

**CORS errors in browser console**
- The server already has CORS enabled for all origins
- Make sure the API URL matches your actual server address

**File too large error**
- Default file size limit is 10MB
- Edit `server.js` line `limits: { fileSize: 10 * 1024 * 1024 }` to change limit
