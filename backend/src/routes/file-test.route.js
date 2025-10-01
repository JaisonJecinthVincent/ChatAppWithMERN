import express from 'express';

const router = express.Router();

// Simple debug endpoint
router.get('/debug', (req, res) => {
  console.log('🔍 Debug endpoint hit');
  res.status(200).json({ 
    message: 'Debug endpoint working',
    timestamp: new Date().toISOString(),
    routes: ['GET /debug', 'GET /test', 'POST /upload-test']
  });
});

// Simple test endpoint to check if file routes are working
router.get('/test', (req, res) => {
  console.log('📁 File routes test endpoint hit');
  res.status(200).json({ 
    message: 'File routes are working',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check file upload without actual processing
router.post('/upload-test', (req, res) => {
  console.log('📁 Upload test endpoint hit');
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.get('content-type'));
  console.log('Files:', req.files);
  console.log('File:', req.file);
  console.log('Body:', req.body);
  
  res.status(200).json({
    message: 'Upload test endpoint working',
    hasFile: !!req.file,
    hasFiles: !!req.files,
    contentType: req.get('content-type'),
  });
});

export default router;