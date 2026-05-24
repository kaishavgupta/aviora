import Constants from 'expo-constants';

let LOCAL_ENV = {};
try {
  // eslint-disable-next-line global-require
  LOCAL_ENV = require('../env.local');
} catch (e) {
  LOCAL_ENV = {};
}

const getExtra = () =>
  Constants?.expoConfig?.extra ||
  Constants?.manifest2?.extra ||
  Constants?.manifest?.extra ||
  {};

const env = (key) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  if (LOCAL_ENV && LOCAL_ENV[key]) return LOCAL_ENV[key];
  const extra = getExtra();
  if (extra[key]) return extra[key];
  return '';
};

export const gridFsApiUrl = env('EXPO_GRIDFS_API_URL').replace(/\/$/, '');
const gridFsApiKey = env('EXPO_GRIDFS_API_KEY');

const isLocalOnlyUrl = (url) => {
  if (!url) return true;
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    /^https?:\/\/192\.168\.\d+\.\d+/.test(url) ||
    /^https?:\/\/10\.\d+\.\d+\.\d+/.test(url)
  );
};

/**
 * Helper function to extract a file extension from a URI string.
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
    throw new Error(
      'Document upload API is not configured. Set EXPO_GRIDFS_API_URL to your deployed GridFS API (HTTPS), then rebuild the APK.'
    );
  }
  if (isLocalOnlyUrl(gridFsApiUrl)) {
    throw new Error(
      'Document upload API is set to a local address. Deploy the GridFS API (see GRIDFS_SETUP.md) and set EXPO_GRIDFS_API_URL to the public HTTPS URL.'
    );
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

const fetchWithTimeout = async (url, options = {}, timeoutMs = 45000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Upload timed out. Check your internet connection and that the API is running at ${gridFsApiUrl}.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Uploads a single document to MongoDB GridFS via the Node upload API.
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
    if (error.message?.includes('timed out')) throw error;
    throw new Error(
      `Cannot reach the document upload server at ${gridFsApiUrl}. Ensure the GridFS API is deployed and online (see GRIDFS_SETUP.md).`
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

export const uploadMultipleDocuments = async (documents, requestId, uid, onProgress) => {
  const uploadPromises = documents.map((doc) => {
    if (!doc.uri) return Promise.resolve(null);
    return uploadDocument(doc.uri, requestId, doc.docType, uid, (percent) => {
      if (onProgress) onProgress(percent, doc.docType);
    });
  });

  const results = await Promise.all(uploadPromises);
  return results.filter(Boolean);
};

/**
 * Deletes a file from GridFS through the API.
 *
 * @param {string} fileId - GridFS file ObjectId string.
 */
export const deleteDocument = async (fileId) => {
  validateUploadConfig();
  if (!fileId || fileId.includes('://')) return;

  let response;
  try {
    response = await fetchWithTimeout(`${gridFsApiUrl}/files/${fileId}`, {
      method: 'DELETE',
      headers: gridFsApiKey ? { Authorization: `Bearer ${gridFsApiKey}` } : undefined,
    }, 15000);
  } catch (error) {
    throw new Error(`Cannot reach the document upload server at ${gridFsApiUrl}.`);
  }

  if (!response.ok && response.status !== 404) {
    throw new Error(await parseUploadError(response));
  }
};
