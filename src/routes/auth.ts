import express from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import {
  validateRegistration,
  validateLogin,
  validateOTP,
  validateForgotPassword,
  validateResetPassword
} from '../middleware/validation';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validateRegistration, AuthController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateLogin, AuthController.login);

// @route   POST /api/auth/google-signin
// @desc    Google signin
// @access  Public
router.post('/google-signin', AuthController.googleAuth);


// @route   POST /api/auth/verify-otp
// @desc    Verify OTP for email verification
// @access  Public
router.post('/verify-otp', validateOTP, AuthController.verifyOTP);

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP for email verification or password reset
// @access  Public
router.post('/resend-otp', validateOTP, AuthController.resendOTP);

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public (uses refresh token)
router.post('/refresh', AuthController.refreshToken);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset OTP
// @access  Public
router.post('/forgot-password', validateForgotPassword, AuthController.forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
router.post('/reset-password', validateResetPassword, AuthController.resetPassword);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticate, AuthController.getProfile);

// @route   PATCH /api/auth/profile
// @desc    Update current user profile
// @access  Private
router.patch('/profile', authenticate, AuthController.updateProfile);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticate, AuthController.logout);

export default router;
