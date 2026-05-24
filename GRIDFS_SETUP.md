# MongoDB GridFS document storage

Passenger documents are stored in **MongoDB GridFS** (not Firebase Storage). The mobile app calls a small **Node/Express API**; the API writes files to Atlas.

## Architecture

```text
Mobile APK  --HTTPS-->  GridFS API (Render/Railway/local)  -->  MongoDB Atlas (GridFS)
                              |
Firestore  <-- request metadata (documentUrls, documentPaths)
Firebase Auth  <-- login only (free tier)
```

## 1. MongoDB Atlas (free M0)

1. Create a cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Database user + password.
3. **Network Access** → allow `0.0.0.0/0` (required for cloud API hosts like Render).
4. Copy the connection string into your server env:

```env
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/aviora?retryWrites=true&w=majority
```

## 2. Deploy the upload API (required for APK / any network)

Local `192.168.x.x` URLs only work on the same Wi‑Fi. For real phones on mobile data, deploy the API publicly.

### Option A — Render (free web service)

1. Push this repo to GitHub.
2. [render.com](https://render.com) → **New** → **Blueprint** → connect repo (uses `render.yaml`),  
   **or** **New Web Service** → root directory = repo root, start: `node server/gridfsApi.js`.
3. Set environment variables:

| Variable | Example |
|----------|---------|
| `MONGODB_URI` | your Atlas connection string |
| `MONGODB_DB_NAME` | `aviora` |
| `GRIDFS_BUCKET_NAME` | `request_documents` |
| `GRIDFS_API_KEY` | long random secret (same in app) |
| `GRIDFS_PUBLIC_BASE_URL` | `https://aviora-gridfs-api.onrender.com` (your service URL, no trailing slash) |

4. After deploy, open `https://YOUR-SERVICE.onrender.com/health` → should return `{"ok":true}`.

### Option B — Local dev (same Wi‑Fi only)

```bash
npm run gridfs:api
```

```env
EXPO_GRIDFS_API_URL=http://192.168.1.8:4000
GRIDFS_PUBLIC_BASE_URL=http://192.168.1.8:4000
EXPO_GRIDFS_API_KEY=your-dev-token
GRIDFS_API_KEY=your-dev-token
```

## 3. Point the mobile app at the public API

In `app.json` → `expo.extra` (or `.env` for local Expo):

```json
"EXPO_GRIDFS_API_URL": "https://aviora-gridfs-api.onrender.com",
"EXPO_GRIDFS_API_KEY": "same-secret-as-GRIDFS_API_KEY-on-server"
```

Rebuild the APK:

```bash
npm run build:apk
```

## 4. How files are stored

GridFS collections:

```text
request_documents.files
request_documents.chunks
```

Firestore request document:

```text
documentUrls: ["https://.../files/<gridfs-file-id>"]
documentPaths: ["<gridfs-file-id>"]
```

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| POST | `/files` | Upload (multipart: file, requestId, uid, docType) |
| GET | `/files/:fileId` | Download / view |
| DELETE | `/files/:fileId` | Delete (requires API key) |

Max file size: **5MB**. Types: PDF, PNG, JPEG.
