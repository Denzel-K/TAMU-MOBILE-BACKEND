import { Document } from 'mongoose';

// User interfaces
export interface ISocialLinks {
  twitter?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

export interface IUser extends Document {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  googleId?: string;
  phone?: string;
  password: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  otp?: {
    code: string;
    expiresAt: Date;
    type: 'email_verification' | 'phone_verification' | 'password_reset';
  };
  refreshTokens: string[];
  profilePhoto?: string;
  socialLinks?: ISocialLinks;
  expoPushTokens?: { token: string; platform: 'android' | 'ios' | 'web'; updatedAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
}

export interface IUserRegistration {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}

export interface IUserLogin {
  emailOrPhone: string;
  password: string;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthResponse {
  success: boolean;
  message: string;
  user?: Partial<IUser>;
  tokens?: IAuthTokens;
}

// Restaurant related interfaces (from frontend types)
export interface IRestaurant extends Document {
  _id: string;
  name: string;
  cuisine: string;
  rating: number;
  reviewsCount: number;
  distance: number;
  image: string;
  coordinates: { latitude: number; longitude: number };
  priceRange: string;
  isFeatured: boolean;
  operatingHours?: { [key: string]: string | undefined };
  contact: {
    phone: string;
    whatsapp: string;
    email?: string;
    instagram?: string;
  };
  deliveryZones?: string[];
  specialFeatures?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type OrderType = 'dine-in' | 'takeaway' | 'delivery';
export type ReservationType = 'table' | 'space' | 'catering';
export type OrderStatus = 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface IOrder extends Document {
  _id: string;
  userId: string;
  restaurantId: string;
  type: OrderType;
  items: { name: string; quantity: number; price: number }[];
  totalAmount: number;
  partySize?: number;
  deliveryAddress?: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReservation extends Document {
  _id: string;
  userId: string;
  restaurantId: string;
  type: ReservationType;
  partySize: number;
  date: string;
  time: string;
  specialRequests?: string;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
}
