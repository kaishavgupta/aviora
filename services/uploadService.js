import Constants from 'expo-constants';

let LOCAL_ENV = {};
try {
  // eslint-disable-next-line global-require
  LOCAL_ENV = require('../env.local');
} catch (e) {
  LOCAL_ENV = {};
}

const env = (key) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  if (LOCAL_ENV && LOCAL_ENV[key]) return LOCAL_ENV[key];
  if (Constants?.expoConfig?.extra && Constants.expoConfig.extra[key]) return Constants.expoConfig.extra[key];
  if (Constants?.manifest?.extra && Constants.manifest.extra[key]) return Constants.manifest.extra[key];
  return '';
};

export const gridFsApiUrl = env('EXPO_GRIDFS_API_URL').replace(/\/$/, '');
const gridFsApiKey = env('EXPO_GRIDFS_API_KEY');

/**
 * Helper function to extract a file extension from a URI string.
 *
 * @param {string} uri - The local file URI.
 * @returns {string} The lowercase file extension (e.g. 'jpg', 'png', 'pdf'), defaulting to 'jpg'.
 */
export const getFileExtension = (uri) => {
  if (!uri) return 'jpg';
  const parts = uri.split('.');
  if (parts.length <= 1) return 'jpg';

  const lastPart = parts.pop();
  const ext = lastPart.split('?')[0].toLowerCase();
  return ext || 'jpg';
};

const getContentType = (ext) => {
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'application/octet-stream';
};

const getFilename = (uri, docType) => {
  const raw = uri?.split('/').pop()?.split('?')[0] || `${docType}.${getFileExtension(uri)}`;
  return raw.includes('.') ? raw : `${raw}.${getFileExtension(uri)}`;
};

export const validateUploadConfig = () => {
  if (!gridFsApiUrl) {
    throw new Error('GridFS upload API is not configured. Set EXPO_GRIDFS_API_URL in .env and restart Expo with cache clear.');
  }
};

const parseUploadError = async (response) => {
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    return json.error || json.message || text;
  } catch (e) {
    return text || `Upload failed with status ${response.status}`;
  }
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 20000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Document upload API timed out after ${Math.round(timeoutMs / 1000)} seconds at ${gridFsApiUrl}.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Uploads a single document file to the GridFS API.
 *
 * @param {string} uri - The local file URI.
 * @param {string} requestId - The Firestore request document ID.
 * @param {string} docType - The document classification ('id' | 'ticket' | 'medical').
 * @param {string} uid - The user's UID.
 * @param {Function} [onProgress] - Optional callback receiving progress percentage (0-100).
 * @returns {Promise<{downloadURL: string, path: string, docType: string}>} File details on success.
 */
export const uploadDocument = async (uri, requestId, docType, uid, onProgress) => {
  validateUploadConfig();

  const ext = getFileExtension(uri);
  const filename = getFilename(uri, docType);
  const contentType = getContentType(ext);

  if (onProgress) onProgress(15);

  const formData = new FormData();
  formData.append('file', {
    uri,
    name: filename,
    type: contentType,
  });
  formData.append('requestId', requestId);
  formData.append('uid', uid);
  formData.append('docType', docType);

  let response;
  try {
    response = await fetchWithTimeout(`${gridFsApiUrl}/files`, {
      method: 'POST',
      headers: gridFsApiKey ? { Authorization: `Bearer ${gridFsApiKey}` } : undefined,
      body: formData,
    });
  } catch (error) {
    throw new Error(
      `Cannot reach document upload API at ${gridFsApiUrl}. Start it with "npm run gridfs:api" and make sure your phone and computer are on the same Wi-Fi.`
    );
  }

  if (onProgress) onProgress(80);

  if (!response.ok) {
    throw new Error(await parseUploadError(response));
  }

  const data = await response.json();

  if (onProgress) onProgress(100);

  return {
    downloadURL: data.downloadURL,
    path: data.fileId,
    docType,
  };
};

/**
 * Uploads multiple document files concurrently and tracks progress individually.
 *
 * @param {Array<{uri: string, docType: string}>} documents - Array of document descriptor objects.
 * @param {string} requestId - The Firestore request document ID.
 * @param {string} uid - The user's UID.
 * @param {Function} [onProgress] - Optional callback receiving progress percentage and docType.
 * @returns {Promise<Array<{downloadURL: string, path: string, docType: string}>>} List of successfully uploaded files.
 */
export const uploadMultipleDocuments = async (documents, requestId, uid, onProgress) => {
  const uploadPromises = documents.map((doc) => {
    if (!doc.uri) return Promise.resolve(null);

    return uploadDocument(doc.uri, requestId, doc.docType, uid, (percent) => {
      if (onProgress) {
        onProgress(percent, doc.docType);
      }
    });
  });

  const results = await Promise.all(uploadPromises);
  return results.filter(Boolean);
};

/**
 * Deletes a file from GridFS through the API.
 *
 * @param {string} fileId - GridFS file ObjectId as a string.
 * @returns {Promise<void>}
 */
export const deleteDocument = async (fileId) => {
  validateUploadConfig();
  if (!fileId) return;

  let response;
  try {
    response = await fetchWithTimeout(`${gridFsApiUrl}/files/${fileId}`, {
      method: 'DELETE',
      headers: gridFsApiKey ? { Authorization: `Bearer ${gridFsApiKey}` } : undefined,
    }, 10000);
  } catch (error) {
    throw new Error(`Cannot reach document upload API at ${gridFsApiUrl}.`);
  }

  if (!response.ok && response.status !== 404) {
    throw new Error(await parseUploadError(response));
  }
};
