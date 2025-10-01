import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../lib/cloudinary.js'; // Use configured cloudinary instance

// Define allowed file types and their limits
const fileConfig = {
  image: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'chat_images'
  },
  video: {
    extensions: ['mp4', 'webm', 'avi', 'mov', 'wmv', 'flv'],
    maxSize: 50 * 1024 * 1024, // 50MB
    folder: 'chat_videos'
  },
  audio: {
    extensions: ['mp3', 'wav', 'ogg', 'aac', 'flac'],
    maxSize: 20 * 1024 * 1024, // 20MB
    folder: 'chat_audio'
  },
  document: {
    extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
    maxSize: 25 * 1024 * 1024, // 25MB
    folder: 'chat_documents'
  },
  archive: {
    extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
    maxSize: 100 * 1024 * 1024, // 100MB
    folder: 'chat_archives'
  },
  other: {
    extensions: [],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'chat_files'
  }
};

// Determine file type based on extension
const getFileType = (filename) => {
  if (!filename) return 'other';
  
  const extension = filename.split('.').pop()?.toLowerCase();
  
  for (const [type, config] of Object.entries(fileConfig)) {
    if (config.extensions.includes(extension)) {
      return type;
    }
  }
  
  return 'other';
};

// Custom filename function
const generateFileName = (req, file) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const extension = file.originalname.split('.').pop();
  return `${timestamp}_${randomString}.${extension}`;
};

// Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    try {
      console.log('🔧 Processing file for Cloudinary:', file.originalname);
      
      const fileType = getFileType(file.originalname);
      const config = fileConfig[fileType];
      
      console.log(`📂 File type: ${fileType}, Folder: ${config.folder}`);
      
      return {
        folder: config.folder,
        public_id: generateFileName(req, file),
        resource_type: 'auto', // Automatically detect resource type
        type: 'upload', // Make sure files are publicly accessible
        access_mode: 'public', // Ensure public access
        allowed_formats: config.extensions.length > 0 ? config.extensions : undefined,
      };
    } catch (error) {
      console.error('❌ Cloudinary params error:', error);
      throw error;
    }
  },
});

// File filter function
const fileFilter = (req, file, cb) => {
  try {
    console.log('🔍 Filtering file:', file.originalname);
    const fileType = getFileType(file.originalname);
    const config = fileConfig[fileType];
    
    if (!config) {
      console.log('❌ Unsupported file type:', fileType);
      return cb(new Error(`Unsupported file type: ${fileType}`), false);
    }
    
    // Check file size (multer will handle this, but we can add extra validation)
    if (file.size && file.size > config.maxSize) {
      return cb(new Error(`File too large. Maximum size for ${fileType} files is ${config.maxSize / 1024 / 1024}MB`), false);
    }
    
    // Check file extension
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (fileType !== 'other' && !config.extensions.includes(extension)) {
      return cb(new Error(`File type not supported. Allowed extensions for ${fileType}: ${config.extensions.join(', ')}`), false);
    }
    
    console.log('✅ File type accepted:', fileType);
    cb(null, true);
  } catch (error) {
    console.error('❌ File filter error:', error);
    cb(error, false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (individual file limits handled in fileFilter)
    files: 5, // Maximum 5 files per request
  },
});

// Middleware for single file upload
export const uploadSingleFile = upload.single('file');

// Middleware for multiple file upload
export const uploadMultipleFiles = upload.array('files', 5);

// File upload handler
export const handleFileUpload = async (req, res) => {
  try {
    console.log('📁 File upload request received');
    console.log('Request file:', req.file ? 'Present' : 'Missing');
    
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('📄 File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const file = req.file;
    const fileType = getFileType(file.originalname);
    
    console.log('🔍 Detected file type:', fileType);
    
    const fileData = {
      url: file.path,
      filename: file.originalname,
      size: file.size,
      type: fileType,
      mimeType: file.mimetype,
      cloudinaryId: file.filename,
    };

    console.log('✅ File processed successfully:', fileData.filename);

    res.status(200).json({
      success: true,
      file: fileData,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
};

// Multiple files upload handler
export const handleMultipleFileUpload = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => {
      const fileType = getFileType(file.originalname);
      
      return {
        url: file.path,
        filename: file.originalname,
        size: file.size,
        type: fileType,
        mimeType: file.mimetype,
        cloudinaryId: file.filename,
      };
    });

    res.status(200).json({
      success: true,
      files: uploadedFiles,
      message: `${uploadedFiles.length} files uploaded successfully`
    });

  } catch (error) {
    console.error('Multiple file upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
};

// File deletion handler
export const deleteFile = async (req, res) => {
  try {
    const { cloudinaryId } = req.params;
    
    if (!cloudinaryId) {
      return res.status(400).json({ error: 'File ID required' });
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(cloudinaryId);
    
    if (result.result === 'ok') {
      res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'File not found or already deleted'
      });
    }

  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ error: 'File deletion failed' });
  }
};

export { fileConfig, getFileType };