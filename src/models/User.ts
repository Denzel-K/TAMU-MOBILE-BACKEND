import mongoose, { Schema, CallbackError } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUser } from '../types';

const userSchema = new Schema<IUser>({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  phone: {
    type: String,
    required: false, // Made optional for Google auth users
    unique: true,
    sparse: true, // Allows null values while maintaining uniqueness for non-null values
    trim: true,
    match: [
      /^[\+]?[1-9][\d]{0,15}$/,
      'Please enter a valid phone number'
    ]
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values while maintaining uniqueness
    select: false // Don't include in queries by default
  },
  profilePhoto: {
    type: String,
    required: false,
  },
  socialLinks: {
    twitter: { type: String },
    instagram: { type: String },
    facebook: { type: String },
    tiktok: { type: String },
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    code: {
      type: String,
      select: false
    },
    expiresAt: {
      type: Date,
      select: false
    },
    type: {
      type: String,
      enum: ['email_verification', 'phone_verification', 'password_reset'],
      select: false
    }
  },
  refreshTokens: {
    type: [String],
    default: [],
    select: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any): any {
      delete ret.password;
      delete ret.otp;
      delete ret.refreshTokens;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

// Hash password before saving
userSchema.pre('save', async function(this: IUser, next: (error?: CallbackError) => void): Promise<void> {
  if (!this.isModified('password')) {
    next();
    return;
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as CallbackError);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(this: IUser, candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT access token
userSchema.methods.generateAuthToken = function(this: IUser): string {
  const payload = {
    id: this._id,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName
  };
  
  const secret = process.env.JWT_SECRET || 'fallback_secret';
  
  return jwt.sign(payload, secret, { 
    expiresIn: (process.env.JWT_EXPIRE || '7d') as any 
  });
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function(this: IUser): string {
  const payload = {
    id: this._id,
    type: 'refresh'
  };
  
  const secret = process.env.JWT_SECRET || 'fallback_secret';
  const token = jwt.sign(payload, secret, { 
    expiresIn: '30d' as any 
  });
  
  return token;
};

// Clean up expired OTPs
userSchema.methods.clearExpiredOTP = function(this: IUser): void {
  if (this.otp && this.otp.expiresAt && this.otp.expiresAt < new Date()) {
    this.otp = undefined;
  }
};

export default mongoose.model<IUser>('User', userSchema);
