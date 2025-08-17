import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { IUserRegistration, IUserLogin, IAuthResponse } from '../types';
import { generateOTP, getOTPExpiryTime, isOTPExpired } from '../utils/otpGenerator';
import emailService from '../services/emailService';
import { OAuth2Client } from 'google-auth-library';

export class AuthController {
  // Refresh access token using refresh token
  static async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body || {};
      if (!refreshToken || typeof refreshToken !== 'string') {
        return res.status(400).json({ success: false, message: 'Refresh token is required' });
      }

      const secret = process.env.JWT_SECRET || 'fallback_secret';
      let payload: any;
      try {
        payload = jwt.verify(refreshToken, secret);
      } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid refresh token' });
      }

      if (!payload || (payload as any).type !== 'refresh' || !(payload as any).id) {
        return res.status(401).json({ success: false, message: 'Invalid refresh token payload' });
      }

      const user = await User.findById((payload as any).id).select('+refreshTokens');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Ensure the provided refresh token is one we issued
      const tokenExists = Array.isArray(user.refreshTokens) && user.refreshTokens.includes(refreshToken);
      if (!tokenExists) {
        return res.status(401).json({ success: false, message: 'Refresh token not recognized' });
      }

      // Rotate tokens: issue new access + refresh, replace the used refresh token
      const newAccessToken = user.generateAuthToken();
      const newRefreshToken = user.generateRefreshToken();

      user.refreshTokens = user.refreshTokens
        .filter((t: string) => t !== refreshToken)
        .concat(newRefreshToken);
      await user.save();

      const response: IAuthResponse = {
        success: true,
        message: 'Token refreshed successfully',
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
        },
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Refresh token error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error during token refresh' });
    }
  }
  // Update current user profile
  static async updateProfile(req: Request, res: Response): Promise<Response> {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }
      const { firstName, lastName, email, phone } = req.body;
      // Basic validation (expand as needed)
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
      // Check for email/phone uniqueness if changed
      if (email !== user.email) {
        const emailExists = await User.findOne({ email });
        if (emailExists) {
          return res.status(409).json({ success: false, message: 'Email already in use' });
        }
      }
      if (phone && phone !== user.phone) {
        const phoneExists = await User.findOne({ phone });
        if (phoneExists) {
          return res.status(409).json({ success: false, message: 'Phone already in use' });
        }
      }
      user.firstName = firstName;
      user.lastName = lastName;
      user.email = email;
      user.phone = phone;
      await user.save();
      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Register new user
  static async register(req: Request, res: Response): Promise<Response> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { firstName, lastName, email, phone, password, confirmPassword }: IUserRegistration = req.body;

      // Check if passwords match
      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match'
        });
      }

      // Check if user already exists
      const existingUserQuery: any = { email };
      if (phone) {
        existingUserQuery.$or = [{ email }, { phone }];
        delete existingUserQuery.email;
      }
      
      const existingUser = await User.findOne(existingUserQuery);

      if (existingUser) {
        const field = existingUser.email === email ? 'email' : 'phone';
        return res.status(409).json({
          success: false,
          message: `User with this ${field} already exists`
        });
      }

      // Create new user
      const user = new User({
        firstName,
        lastName,
        email,
        phone,
        password
      });

      // Generate OTP for email verification
      const otpCode = generateOTP(6);
      user.otp = {
        code: otpCode,
        expiresAt: getOTPExpiryTime(10), // 10 minutes
        type: 'email_verification'
      };

      await user.save();

      // Send OTP via email
      try {
        const emailSent = await emailService.sendOTPVerificationEmail({
          firstName: user.firstName,
          email: user.email,
          otpCode,
          expiryMinutes: 10
        });
        
        if (!emailSent) {
          console.error('Failed to send OTP email, but user was created');
        }
      } catch (emailError) {
        console.error('Email service error:', emailError);
        // Don't fail registration if email fails, but log it
      }

      const response: IAuthResponse = {
        success: true,
        message: 'User registered successfully. Please verify your email with the OTP sent.',
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified
        }
      };

      return res.status(201).json(response);
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during registration'
      });
    }
  }

  // Login user
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { emailOrPhone, password }: IUserLogin = req.body;

      // Find user by email or phone
      const user = await User.findOne({
        $or: [
          { email: emailOrPhone.toLowerCase() },
          { phone: emailOrPhone }
        ]
      }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate tokens
      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      // Save refresh token
      user.refreshTokens = [...(user.refreshTokens || []), refreshToken];
      await user.save();

      const response: IAuthResponse = {
        success: true,
        message: 'Login successful',
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified
        },
        tokens: {
          accessToken,
          refreshToken
        }
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  }

  // Verify OTP
  static async verifyOTP(req: Request, res: Response): Promise<Response> {
    try {
      const { email, otp } = req.body;
      console.log(`Email: ${email}, OTP Code: ${otp}`)

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Email and OTP are required'
        });
      }

      const user = await User.findOne({ email }).select('+otp');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.otp) {
        return res.status(400).json({
          success: false,
          message: 'No OTP found. Please request a new one.'
        });
      }

      if (isOTPExpired(user.otp.expiresAt)) {
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new one.'
        });
      }

      // Generate tokens before saving
      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();
      
      // Update user in a single operation
      user.isEmailVerified = true;
      user.otp = undefined;
      user.refreshTokens = [...(user.refreshTokens || []), refreshToken];
      
      // Save all changes at once
      await user.save();

      // Send welcome email after successful verification (non-blocking)
      emailService.sendWelcomeEmail({
        firstName: user.firstName,
        email: user.email
      }).catch(error => {
        console.error('Failed to send welcome email:', error);
        // Don't fail the verification if welcome email fails
      });

      const response: IAuthResponse = {
        success: true,
        message: 'Email verified successfully',
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified
        },
        tokens: {
          accessToken,
          refreshToken
        }
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('OTP verification error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during OTP verification'
      });
    }
  }

  // Google Signin
  static async googleAuth(req: Request, res: Response): Promise<Response> {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required'
      });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    if (!payload) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token'
      });
    }

    const { email, given_name, family_name, sub: googleId } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email not provided by Google'
      });
    }

    // Check if user already exists
    let user = await User.findOne({ 
      $or: [{ email }, { googleId }]
    });

    if (!user) {
      // Create new user
      user = new User({
        firstName: given_name || 'Google',
        lastName: family_name || 'User',
        email,
        googleId,
        isEmailVerified: true, // Google verified the email
        password: 'google-auth' // Dummy password, won't be used
      });

      await user.save();
    } else if (!user.googleId) {
      // User exists but didn't sign up with Google before
      user.googleId = googleId;
      user.isEmailVerified = true;
      await user.save();
    }

    // Generate tokens
    const token = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // Add refresh token to user's list
    user.refreshTokens.push(refreshToken);
    await user.save();

    const response: IAuthResponse = {
      success: true,
      message: 'Google authentication successful',
      tokens: {
        accessToken: token,
        refreshToken: refreshToken
      },
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified
      }
    };

    return res.status(200).json(response);
    } catch (error) {
      console.error('Google auth error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during Google authentication'
      });
    }
  }

  // Forgot password
  static async forgotPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.status(200).json({
          success: true,
          message: 'If an account with this email exists, a password reset code has been sent.'
        });
      }

      // Generate OTP for password reset
      const otpCode = generateOTP(6);
      user.otp = {
        code: otpCode,
        expiresAt: getOTPExpiryTime(10), // 10 minutes
        type: 'password_reset'
      };

      await user.save();

      // Send password reset OTP via email
      try {
        const emailSent = await emailService.sendPasswordResetEmail({
          firstName: user.firstName,
          email: user.email,
          otpCode,
          expiryMinutes: 10
        });
        
        if (!emailSent) {
          console.error('Failed to send password reset email');
        }
      } catch (emailError) {
        console.error('Email service error:', emailError);
      }

      return res.status(200).json({
        success: true,
        message: 'If an account with this email exists, a password reset code has been sent.'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Reset password
  static async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { email, otp, newPassword, confirmPassword } = req.body;

      if (!email || !otp || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match'
        });
      }

      const user = await User.findOne({ email }).select('+otp +password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.otp || user.otp.type !== 'password_reset') {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset request'
        });
      }

      if (isOTPExpired(user.otp.expiresAt)) {
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new one.'
        });
      }

      if (user.otp.code !== otp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP'
        });
      }

      // Update password and clear OTP
      user.password = newPassword;
      user.otp = undefined;
      user.refreshTokens = []; // Invalidate all refresh tokens
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Resend OTP
  static async resendOTP(req: Request, res: Response): Promise<Response> {
    try {
      const { email, type = 'email_verification' } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Generate new OTP
      const otpCode = generateOTP(6);
      user.otp = {
        code: otpCode,
        expiresAt: getOTPExpiryTime(10), // 10 minutes
        type: type as 'email_verification' | 'password_reset'
      };

      await user.save();

      // Send OTP via email based on type
      try {
        let emailSent = false;
        if (type === 'password_reset') {
          emailSent = await emailService.sendPasswordResetEmail({
            firstName: user.firstName,
            email: user.email,
            otpCode,
            expiryMinutes: 10
          });
        } else {
          emailSent = await emailService.sendOTPVerificationEmail({
            firstName: user.firstName,
            email: user.email,
            otpCode,
            expiryMinutes: 10
          });
        }
        
        if (!emailSent) {
          console.error('Failed to resend OTP email');
        }
      } catch (emailError) {
        console.error('Email service error during resend:', emailError);
      }

      return res.status(200).json({
        success: true,
        message: 'OTP has been resent successfully'
      });
    } catch (error) {
      console.error('Resend OTP error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get current user profile
  static async getProfile(req: Request, res: Response): Promise<Response> {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Logout user
  static async logout(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Normalize refreshTokens to a safe array to avoid runtime errors
      const currentTokens = Array.isArray((user as any).refreshTokens)
        ? (user as any).refreshTokens as string[]
        : [];

      if (refreshToken) {
        // Remove specific refresh token
        user.refreshTokens = currentTokens.filter(token => token !== refreshToken);
      } else {
        // Remove all refresh tokens (logout from all devices)
        user.refreshTokens = [];
      }

      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
