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

// Tamu brand colors from global.css
const colors = {
  primary: '#00CE81',
  primaryDark: '#009E60',
  primaryLight: '#5CF0B5',
  accent: '#FFC107',
  accentDark: '#C88C00',
  text: '#11181C',
  textSecondary: '#687076',
  background: '#FFFFFF',
  surface: '#F6FEFB',
  border: '#E6E6E6',
  card: '#F3F3F3'
};

const baseTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: ${colors.text};
            background-color: ${colors.surface};
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: ${colors.background};
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
            border-radius: 10px 10px 0 0;
        }
        
        .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
        }
        
        .tagline {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 20px;
            color: ${colors.text};
        }
        
        .message {
            font-size: 16px;
            line-height: 1.7;
            margin-bottom: 30px;
            color: ${colors.textSecondary};
        }
        
        .otp-container {
            background-color: ${colors.surface};
            border: 2px solid ${colors.primary};
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        
        .otp-label {
            font-size: 14px;
            font-weight: 500;
            color: ${colors.textSecondary};
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .otp-code {
            font-size: 36px;
            font-weight: bold;
            color: ${colors.primary};
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
        }
        
        .otp-expiry {
            font-size: 14px;
            color: ${colors.textSecondary};
            margin-top: 15px;
        }
        
        .button {
            display: inline-block;
            background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%);
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: transform 0.2s ease;
        }
        
        .button:hover {
            transform: translateY(-2px);
        }
        
        .warning {
            background-color: #FFF3CD;
            border: 1px solid #FFEAA7;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .warning-text {
            color: #856404;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .footer {
            background-color: ${colors.card};
            padding: 30px;
            text-align: center;
            border-top: 1px solid ${colors.border};
        }
        
        .footer-text {
            font-size: 14px;
            color: ${colors.textSecondary};
            margin-bottom: 10px;
        }
        
        .social-links {
            margin: 20px 0;
        }
        
        .social-link {
            display: inline-block;
            margin: 0 10px;
            color: ${colors.primary};
            text-decoration: none;
            font-weight: 500;
        }
        
        .divider {
            height: 1px;
            background-color: ${colors.border};
            margin: 30px 0;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 30px 20px;
            }
            
            .otp-code {
                font-size: 28px;
                letter-spacing: 4px;
            }
        }
    </style>
</head>
<body>
    <div style="padding: 20px;">
        <div class="container">
            <div class="header">
                <div class="logo">
                    <img src="cid:tamu_logo" alt="TAMU" style="height: 60px; width: auto; vertical-align: middle; margin-right: 0;">
                    <span style="margin-top: 6px;">TAMU</span>
                </div>
                <div class="tagline">Discover. Order. Enjoy.</div>
            </div>
            
            ${content}
            
            <div class="footer">
                <div class="footer-text">
                    Thank you for choosing Tamu
                </div>
                <div class="social-links">
                    <a href="#" class="social-link">Website</a>
                    <a href="#" class="social-link">Instagram</a>
                    <a href="#" class="social-link">Facebook</a>
                </div>
                <div class="footer-text" style="font-size: 12px; margin-top: 20px;">
                    This email was sent to ${content.includes('email') ? 'your registered email address' : 'you'}. 
                    If you didn't request this, please ignore this email.
                </div>
            </div>
        </div>
    </div>
</body>
</html>
`;

export const emailTemplates = {
  otpVerification: (data: OTPEmailData) => {
    const content = `
      <div class="content">
          <div class="greeting">Hi ${data.firstName}! 👋</div>
          <div class="message">
              Welcome to Tamu! We're excited to have you join our community of food lovers.
              <br><br>
              To complete your registration and verify your email address, please use the verification code below:
          </div>
          
          <div class="otp-container">
              <div class="otp-label">Your Verification Code</div>
              <div class="otp-code">${data.otpCode}</div>
              <div class="otp-expiry">⏰ This code expires in ${data.expiryMinutes} minutes</div>
          </div>
          
          <div class="message">
              Simply enter this code in the app to verify your email and start exploring our delicious menu!
          </div>
          
          <div class="warning">
              <div class="warning-text">
                  🔒 <strong>Security Note:</strong> Never share this code with anyone. Tamu staff will never ask for your verification code.
              </div>
          </div>
      </div>
    `;
    return baseTemplate(content, 'Verify Your Email - Tamu');
  },

  passwordReset: (data: OTPEmailData) => {
    const content = `
      <div class="content">
          <div class="greeting">Hi ${data.firstName},</div>
          <div class="message">
              We received a request to reset your password for your Tamu account.
              <br><br>
              If you requested this password reset, please use the code below to proceed:
          </div>
          
          <div class="otp-container">
              <div class="otp-label">Password Reset Code</div>
              <div class="otp-code">${data.otpCode}</div>
              <div class="otp-expiry">⏰ This code expires in ${data.expiryMinutes} minutes</div>
          </div>
          
          <div class="message">
              Enter this code in the app to create a new password for your account.
          </div>
          
          <div class="warning">
              <div class="warning-text">
                  🔒 <strong>Security Alert:</strong> If you didn't request a password reset, please ignore this email and consider changing your password as a precaution.
              </div>
          </div>
      </div>
    `;
    return baseTemplate(content, 'Password Reset - Tamu');
  },

  welcome: (data: WelcomeEmailData) => {
    const content = `
      <div class="content">
          <div class="greeting">Welcome to Tamu, ${data.firstName}! 🎉</div>
          <div class="message">
              Congratulations! Your email has been successfully verified and your account is now active.
              <br><br>
              You're now part of the Tamu family, where authentic flavors meet modern convenience. 
              Here's what you can look forward to:
          </div>
          
          <div style="margin: 30px 0;">
              <div style="display: flex; align-items: center; margin: 15px 0; padding: 15px; background-color: ${colors.surface}; border-radius: 8px;">
                  <div style="font-size: 24px; margin-right: 15px;">🍽️</div>
                  <div>
                      <div style="font-weight: 600; color: ${colors.text};">Authentic Cuisine</div>
                      <div style="color: ${colors.textSecondary}; font-size: 14px;">Discover traditional flavors crafted with love</div>
                  </div>
              </div>
              
              <div style="display: flex; align-items: center; margin: 15px 0; padding: 15px; background-color: ${colors.surface}; border-radius: 8px;">
                  <div style="font-size: 24px; margin-right: 15px;">🚚</div>
                  <div>
                      <div style="font-weight: 600; color: ${colors.text};">Fast Delivery</div>
                      <div style="color: ${colors.textSecondary}; font-size: 14px;">Fresh meals delivered right to your doorstep</div>
                  </div>
              </div>
              
              <div style="display: flex; align-items: center; margin: 15px 0; padding: 15px; background-color: ${colors.surface}; border-radius: 8px;">
                  <div style="font-size: 24px; margin-right: 15px;">⭐</div>
                  <div>
                      <div style="font-weight: 600; color: ${colors.text};">Loyalty Rewards</div>
                      <div style="color: ${colors.textSecondary}; font-size: 14px;">Earn points with every order and unlock exclusive deals</div>
                  </div>
              </div>
          </div>
          
          <div style="text-align: center;">
              <a href="#" class="button">Start Exploring Menu 🍴</a>
          </div>
          
          <div class="message">
              Ready to embark on a culinary journey? Open the Tamu app and discover your new favorite dishes today!
          </div>
      </div>
    `;
    return baseTemplate(content, 'Welcome to Tamu!');
  }
};
