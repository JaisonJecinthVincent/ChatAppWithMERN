import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  uploadSingleFile,
  uploadMultipleFiles,
  handleFileUpload,
  handleMultipleFileUpload,
  deleteFile
} from "../controllers/file.controller.js";
import cloudinary from '../lib/cloudinary.js';
import axios from 'axios';

const router = express.Router();

// Single file upload
router.post("/upload", protectRoute, uploadSingleFile, handleFileUpload);

// Multiple files upload
router.post("/upload-multiple", protectRoute, uploadMultipleFiles, handleMultipleFileUpload);

// Delete file
router.delete("/:cloudinaryId", protectRoute, deleteFile);

// Proxy endpoint to serve Cloudinary files (no auth required for viewing)
router.get('/proxy/:publicId(*)', async (req, res) => {
  try {
    const { publicId } = req.params;
    
    console.log('📥 File proxy request for:', publicId);
    
    // Generate a signed URL for the file (this will work even for private files)
    const signedUrl = cloudinary.url(publicId, {
      sign_url: true,
      resource_type: 'auto',
      type: 'upload'
    });
    
    console.log('🔗 Generated signed URL');
    
    // Fetch the file from Cloudinary
    const response = await axios({
      method: 'GET',
      url: signedUrl,
      responseType: 'stream'
    });
    
    // Set appropriate headers
    const contentType = response.headers['content-type'];
    const contentLength = response.headers['content-length'];
    
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    console.log('✅ Streaming file to client');
    
    // Stream the file to the client
    response.data.pipe(res);
    
  } catch (error) {
    console.error('❌ File proxy error:', error.message);
    
    if (error.response) {
      // Cloudinary returned an error
      res.status(error.response.status).json({
        error: 'File not found or access denied',
        details: error.response.statusText
      });
    } else {
      // Network or other error
      res.status(500).json({
        error: 'Failed to fetch file',
        details: error.message
      });
    }
  }
});

export default router;