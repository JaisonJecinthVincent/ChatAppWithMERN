import { messageQueue, notificationQueue, emailQueue } from './queue.js';

// Queue admin middleware
export const queueAdminMiddleware = (req, res, next) => {
  // In production, you should add proper authentication here
  // For now, we'll add a simple check
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.QUEUE_ADMIN_KEY || 'admin123';
  
  if (adminKey !== expectedKey) {
    return res.status(401).json({ 
      error: 'Unauthorized access to queue admin panel',
      message: 'Please provide valid admin key in x-admin-key header'
    });
  }
  
  next();
};

// Get queue admin info
export const getQueueAdminInfo = (req, res) => {
  res.json({
    message: 'Queue Admin Panel',
    queues: ['message', 'notification', 'email'],
    endpoints: {
      dashboard: '/admin/queues',
      health: '/api/messages/queue/health',
      metrics: '/api/messages/queue/metrics',
      stats: '/api/messages/queue/stats',
    },
    instructions: {
      access: 'Add x-admin-key header with valid key to access admin endpoints',
      dashboard: 'Visit /admin/queues for visual queue management',
    }
  });
};

