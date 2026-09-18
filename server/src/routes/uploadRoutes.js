import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createOssUploadPolicy, uploadOssStream } from '../services/ossUpload.js';

export const uploadRouter = Router();

uploadRouter.use(requireAuth);

function filenameFromRequest(request) {
  const encoded = String(request.headers['x-upload-filename'] || 'asset');
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

uploadRouter.post('/oss-policy', (req, res, next) => {
  try {
    const upload = createOssUploadPolicy({
      userId: req.user.id,
      filename: req.body?.filename,
      contentType: req.body?.contentType,
      size: req.body?.size,
      assetType: req.body?.assetType,
    });
    res.json({ ok: true, upload });
  } catch (error) {
    next(error);
  }
});

uploadRouter.post('/oss', async (req, res, next) => {
  try {
    const upload = await uploadOssStream({
      userId: req.user.id,
      filename: filenameFromRequest(req),
      contentType: req.headers['content-type'],
      size: req.headers['x-upload-size'] || req.headers['content-length'],
      assetType: req.headers['x-upload-asset-type'],
      stream: req,
    });
    res.json({ ok: true, upload });
  } catch (error) {
    next(error);
  }
});
