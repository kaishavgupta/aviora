require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GridFSBucket, MongoClient, ObjectId } = require('mongodb');
const { Readable } = require('stream');

const {
  GRIDFS_API_PORT = '4000',
  MONGODB_URI,
  MONGODB_DB_NAME = 'aviora',
  GRIDFS_BUCKET_NAME = 'request_documents',
  GRIDFS_PUBLIC_BASE_URL,
  GRIDFS_API_KEY,
} = process.env;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}

if (/[<>]/.test(MONGODB_URI)) {
  console.error('MONGODB_URI still contains placeholder values. Replace <username>, <password>, and <cluster-url> with your MongoDB Atlas connection details.');
  process.exit(1);
}

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('Only PDF, PNG, and JPEG files are allowed.'));
      return;
    }
    cb(null, true);
  },
});

let client;
let bucket;

const withTimeout = (promise, timeoutMs, label) => {
  let timeoutId;
  const timeout = new Promise((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
};

const requireApiKey = (req, res, next) => {
  if (!GRIDFS_API_KEY) {
    next();
    return;
  }

  const authHeader = req.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (token !== GRIDFS_API_KEY) {
    res.status(401).json({ error: 'Unauthorized GridFS API request.' });
    return;
  }

  next();
};

const getBaseUrl = (req) => {
  return (GRIDFS_PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
};

const streamToGridFs = ({ buffer, filename, contentType, metadata }) => {
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata,
    });

    Readable.from([buffer])
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id));
  });
};

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[GridFS API LOG] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/files', requireApiKey, upload.single('file'), async (req, res, next) => {
  console.log('[GridFS API LOG] POST /files called');
  try {
    if (!req.file) {
      console.warn('[GridFS API LOG] Upload request rejected: No file received');
      res.status(400).json({ error: 'No file received.' });
      return;
    }

    const { requestId, uid, docType } = req.body;
    console.log(`[GridFS API LOG] File received: originalname="${req.file.originalname}", size=${req.file.size} bytes, mimetype="${req.file.mimetype}"`);
    console.log(`[GridFS API LOG] Body fields: requestId="${requestId}", uid="${uid}", docType="${docType}"`);

    if (!requestId || !uid || !docType) {
      console.warn('[GridFS API LOG] Upload request rejected: Missing required fields');
      res.status(400).json({ error: 'requestId, uid, and docType are required.' });
      return;
    }

    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${requestId}_${docType}_${uid}_${Date.now()}_${crypto.randomUUID()}_${safeName}`;
    
    console.log(`[GridFS API LOG] Initiating GridFS stream upload for filename="${filename}"`);
    const fileId = await streamToGridFs({
      buffer: req.file.buffer,
      filename,
      contentType: req.file.mimetype,
      metadata: {
        requestId,
        uid,
        docType,
        originalName: req.file.originalname,
      },
    });
    console.log(`[GridFS API LOG] GridFS stream upload succeeded. Saved fileId="${fileId.toString()}"`);

    res.status(201).json({
      fileId: fileId.toString(),
      downloadURL: `${getBaseUrl(req)}/files/${fileId.toString()}`,
      filename,
      contentType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error('[GridFS API LOG] POST /files Encountered Error:', error);
    next(error);
  }
});

app.get('/files/:fileId', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.fileId)) {
      res.status(400).json({ error: 'Invalid file id.' });
      return;
    }

    const fileId = new ObjectId(req.params.fileId);
    const files = await bucket.find({ _id: fileId }).toArray();
    const file = files[0];

    if (!file) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }

    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
    bucket.openDownloadStream(fileId).pipe(res);
  } catch (error) {
    next(error);
  }
});

app.delete('/files/:fileId', requireApiKey, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.fileId)) {
      res.status(400).json({ error: 'Invalid file id.' });
      return;
    }

    await bucket.delete(new ObjectId(req.params.fileId));
    res.status(204).send();
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'File not found.' });
      return;
    }
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const message = error.message || 'GridFS API error.';
  const status = message.includes('File too large') ? 413 : 400;
  console.error('[gridfs-api]', error);
  res.status(status).json({ error: message });
});

const start = async () => {
  console.log(`Connecting to MongoDB database "${MONGODB_DB_NAME}"...`);
  client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });
  await withTimeout(
    client.connect(),
    15000,
    'MongoDB connection'
  );

  const db = client.db(MONGODB_DB_NAME);
  bucket = new GridFSBucket(db, { bucketName: GRIDFS_BUCKET_NAME });

  app.listen(Number(GRIDFS_API_PORT), '0.0.0.0', () => {
    console.log(`GridFS API listening on http://localhost:${GRIDFS_API_PORT}`);
    if (GRIDFS_PUBLIC_BASE_URL) {
      console.log(`Public file base URL: ${GRIDFS_PUBLIC_BASE_URL}`);
    }
  });
};

process.on('SIGINT', async () => {
  if (client) await client.close();
  process.exit(0);
});

start().catch((error) => {
  console.error('Failed to start GridFS API:', error);
  process.exit(1);
});
