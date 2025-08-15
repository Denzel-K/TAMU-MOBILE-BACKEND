import nodemailer from 'nodemailer';
import { emailTemplates } from './emailTemplates';
import path from 'path';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface OTPEmailData {
  firstName: string;
  email: string;
  otpCode: string;
  expiryMinutes: number;
}

interface WelcomeEmailData {
  firstName: string;
  email: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SERVER_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  private async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const logoPath = path.join(__dirname, 'tamu_logo.png');
      
      const mailOptions = {
        from: {
          name: 'Tamu',
          address: process.env.EMAIL_USER || 'noreply@tamu.com'
        },
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: [
          {
            filename: 'tamu_logo.png',
            path: logoPath,
            cid: 'tamu_logo' // Content-ID for embedding in HTML
          }
        ]
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to: ${options.to} . Message ID: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async sendOTPVerificationEmail(data: OTPEmailData): Promise<boolean> {
    const html = emailTemplates.otpVerification(data);
    const text = `Hi ${data.firstName},\n\nYour OTP verification code is: ${data.otpCode}\n\nThis code will expire in ${data.expiryMinutes} minutes.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nTamu Team`;

    return this.sendEmail({
      to: data.email,
      subject: 'Verify Your Email - Tamu',
      html,
      text
    });
  }

  async sendPasswordResetEmail(data: OTPEmailData): Promise<boolean> {
    const html = emailTemplates.passwordReset(data);
    const text = `Hi ${data.firstName},\n\nYour password reset code is: ${data.otpCode}\n\nThis code will expire in ${data.expiryMinutes} minutes.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nTamu Team`;

    return this.sendEmail({
      to: data.email,
      subject: 'Password Reset - Tamu',
      html,
      text
    });
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const html = emailTemplates.welcome(data);
    const text = `Welcome to Tamu, ${data.firstName}!\n\nThank you for joining our community. We're excited to have you on board!\n\nBest regards,\nTamu Team`;

    return this.sendEmail({
      to: data.email,
      subject: 'Welcome to Tamu!',
      html,
      text
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified successfully');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

export default new EmailService();
