import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../lib/cloudinary.js';
import path from 'path';

// Define allowed file types and their configurations
const FILE_TYPES = {
  images: {
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'chat_images'
  },
  documents: {
    mimeTypes: [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ],
    maxSize: 50 * 1024 * 1024, // 50MB
    folder: 'chat_documents'
  },
  audio: {
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
    maxSize: 20 * 1024 * 1024, // 20MB
    folder: 'chat_audio'
  },
  video: {
    mimeTypes: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'],
    maxSize: 100 * 1024 * 1024, // 100MB
    folder: 'chat_videos'
  }
};

// Get file type category
const getFileCategory = (mimetype) => {
  for (const [category, config] of Object.entries(FILE_TYPES)) {
    if (config.mimeTypes.includes(mimetype)) {
      return category;
    }
  }
  return null;
};

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const category = getFileCategory(file.mimetype);
    const folder = category ? FILE_TYPES[category].folder : 'chat_misc';
    
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname) || '';
    
    return {
      folder: folder,
      public_id: `${file.fieldname}-${uniqueSuffix}`,
      resource_type: 'auto', // Automatically detect resource type
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'mp3', 'wav', 'ogg', 'mp4', 'mpeg', 'mov', 'webm'],
      use_filename: true,
      unique_filename: true,
      format: extension.slice(1) || undefined
    };
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const category = getFileCategory(file.mimetype);
  
  if (!category) {
    const allowedTypes = Object.values(FILE_TYPES)
      .map(config => config.mimeTypes)
      .flat()
      .join(', ');
    
    return cb(new Error(`File type ${file.mimetype} is not supported. Allowed types: ${allowedTypes}`), false);
  }
  
  cb(null, true);
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // Maximum file size (100MB)
    files: 5 // Maximum number of files per upload
  }
});

// Middleware for single file upload
export const uploadSingle = upload.single('file');

// Middleware for multiple file upload
export const uploadMultiple = upload.array('files', 5);

// Error handling middleware
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({ 
          error: 'File too large', 
          message: 'Maximum file size is 100MB' 
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ 
          error: 'Too many files', 
          message: 'Maximum 5 files per upload' 
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ 
          error: 'Unexpected field', 
          message: 'File field name is incorrect' 
        });
      default:
        return res.status(400).json({ 
          error: 'Upload error', 
          message: error.message 
        });
    }
  }
  
  if (error.message.includes('File type')) {
    return res.status(400).json({ 
      error: 'Invalid file type', 
      message: error.message 
    });
  }
  
  return res.status(500).json({ 
    error: 'Server error', 
    message: 'An unexpected error occurred during file upload' 
  });
};

// Helper function to get file info
export const getFileInfo = (file) => {
  if (!file) return null;
  
  const category = getFileCategory(file.mimetype);
  
  return {
    url: file.path,
    publicId: file.public_id,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    category: category,
    uploadedAt: new Date()
  };
};