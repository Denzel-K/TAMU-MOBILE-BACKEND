import crypto from 'crypto';

export const generateOTP = (length: number = 6): string => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  
  return otp;
};

export const generateSecureOTP = (length: number = 6): string => {
  const max = Math.pow(10, length) - 1;
  const min = Math.pow(10, length - 1);
  
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
};

export const isOTPExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt;
};

export const getOTPExpiryTime = (minutes: number = 10): Date => {
  const now = new Date();
  return new Date(now.getTime() + minutes * 60 * 1000);
};
