import express from 'express';
import passport from '../lib/passport.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15d' });
};

// Helper function to set cookie and redirect
const handleOAuthSuccess = (req, res) => {
  try {
    const user = req.user;
    const token = generateToken(user._id);
    
    // Set HTTP-only cookie
    res.cookie('jwt', token, {
      maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    });

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/success?token=${token}`);
  } catch (error) {
    console.error('OAuth success handler error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/error?message=Authentication failed`);
  }
};

// Helper function to handle OAuth errors
const handleOAuthError = (req, res) => {
  console.error('OAuth error:', req.query.error);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/auth/error?message=${req.query.error || 'Authentication failed'}`);
};

// Google OAuth Routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/oauth/error' }),
  handleOAuthSuccess
);

// Error handling route
router.get('/error', handleOAuthError);

// Get OAuth providers configuration
router.get('/providers', (req, res) => {
  try {
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
    const providers = {
      google: {
        enabled: !!process.env.GOOGLE_CLIENT_ID,
        name: 'Google',
        icon: 'google',
        color: '#4285F4'
      }
    };
    const enabledProviders = Object.entries(providers).filter(([_, config]) => config.enabled);
    res.json({
      providers,
      enabledCount: enabledProviders.length,
      setupRequired: enabledProviders.length === 0,
      message: enabledProviders.length === 0 
        ? 'No OAuth providers configured. Please set up OAuth credentials in your .env file.'
        : `${enabledProviders.length} OAuth provider(s) configured.`
    });
  } catch (error) {
    console.error('Error in /providers route:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

export default router;
