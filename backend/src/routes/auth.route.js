import express from "express";
import { checkAuth, login, logout, signup, updateProfile } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { authRateLimit, userRateLimit } from "../middleware/rateLimiter.js";
import passport from "../lib/passport.js";
import jwt from "jsonwebtoken";

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

// Apply strict rate limiting to auth routes
router.post("/signup", authRateLimit, signup);
router.post("/login", authRateLimit, login);
router.post("/logout", logout);

// Apply user rate limiting to protected routes
router.put("/update-profile", protectRoute, userRateLimit, updateProfile);
router.get("/check", protectRoute, checkAuth);

// OAuth Providers Info Endpoint
router.get('/oauth/providers', (req, res) => {
  try {
    const providers = {};
    
    // Check if Google OAuth is configured
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      providers.google = {
        name: 'Google',
        enabled: true,
        authUrl: '/api/auth/oauth/google'
      };
    }
    
    const enabledCount = Object.keys(providers).length;
    
    res.json({ 
      success: true, 
      providers,
      configured: enabledCount > 0,
      setupRequired: enabledCount === 0,
      message: enabledCount === 0 
        ? 'OAuth setup required. Please configure OAuth providers.'
        : 'OAuth providers configured successfully.'
    });
  } catch (error) {
    console.error('Error getting OAuth providers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error loading OAuth providers',
      providers: {},
      configured: false,
      setupRequired: true
    });
  }
});

// Google OAuth Routes
router.get('/oauth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/oauth/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/oauth/error' }),
  handleOAuthSuccess
);

// Error handling route
router.get('/oauth/error', handleOAuthError);

export default router;
