import multer from 'multer';
import path from 'path';

// Use memory storage to process files before saving to disk or uploading to IPFS
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimes = process.env.ALLOWED_MIME_TYPES?.split(',') || ['image/jpeg', 'image/png', 'video/mp4'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only ${allowedMimes.join(', ')} are allowed.`), false);
  }
};

const limits = {
  fileSize: Number(process.env.MAX_FILE_SIZE) || 1024 * 1024 * 100, // 100MB default
};

export const upload = multer({
  storage,
  fileFilter,
  limits,
});
