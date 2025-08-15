import { Request, Response } from 'express';
import User from '../models/User';
import { IUpdateProfileData, IUpdateSocialLinksData } from '../types/profile';

// Helper to serialize user for frontend UserProfile
function serializeUser(user: any) {
  return {
    id: user._id?.toString?.() ?? user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    avatar: user.profilePhoto,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    role: user.role || 'user',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    socials: user.socialLinks,
  };
}

// @desc    Change password
// @route   POST /api/profile/security/change-password
// @access  Private
export const changePassword = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }

  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
  }

  try {
    const user = await User.findById(req.user._id).select('+password +refreshTokens');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    // Optional: invalidate all sessions upon password change
    user.refreshTokens = [];
    const updatedUser = await user.save();
    return res.status(200).json({ success: true, user: serializeUser(updatedUser) });
  } catch (error) {
    console.log('Error while changing password: ', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Logout all sessions (invalidate refresh tokens)
// @route   POST /api/profile/security/logout-all
// @access  Private
export const logoutAllSessions = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
  try {
    const user = await User.findById(req.user._id).select('+refreshTokens');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.refreshTokens = [];
    await user.save();
    return res.status(200).json({ success: true, message: 'All sessions have been logged out' });
  } catch (error) {
    console.log('Error while logging out all sessions: ', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete account
// @route   DELETE /api/profile
// @access  Private
export const deleteAccount = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await user.deleteOne();
    return res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.log('Error while deleting account: ', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get user profile
// @route   GET /api/profile
// @access  Private
export const getProfile = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
  try {
    const user = await User.findById(req.user._id).select('-password -refreshTokens');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, user: serializeUser(user) });
  } catch (error) {
    console.log('Error while getting profile: ', error)
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/profile
// @access  Private
export const updateProfile = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
  const { firstName, lastName } = req.body as IUpdateProfileData;

  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;

    const updatedUser = await user.save();
    return res.status(200).json({ success: true, user: serializeUser(updatedUser) });

  } catch (error) {
    console.log('Error while updating profile: ', error)
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update social links
// @route   PUT /api/profile/social-links
// @access  Private
export const updateSocialLinks = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
  const socialLinksData = req.body as IUpdateSocialLinksData;

  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.socialLinks = { ...user.socialLinks, ...socialLinksData };
    const updatedUser = await user.save();

    return res.status(200).json({ success: true, user: serializeUser(updatedUser) });

  } catch (error) {
    console.log('Error while updating social links: ', error)
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Upload profile photo
// @route   POST /api/profile/photo
// @access  Private
export const uploadProfilePhoto = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    user.profilePhoto = req.file.path;
    const updatedUser = await user.save();

    return res.status(200).json({ success: true, user: serializeUser(updatedUser) });

  } catch (error) {
    console.log('Error while uploading profile photo: ', error)
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};