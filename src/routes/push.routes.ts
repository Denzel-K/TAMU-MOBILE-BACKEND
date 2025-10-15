import { Router } from 'express';
import User from '../models/User';
import { authenticate } from '../middleware/auth';
import { sendExpoPushAsync } from '../services/pushService';

const router = Router();

// Register or update Expo push token for the authenticated user
router.post('/push-token', authenticate, async (req, res) => {
  try {
    const user = req.user!;
    const { token, platform } = req.body as { token?: string; platform?: 'android' | 'ios' | 'web' };
    if (!token || !platform) {
      res.status(400).json({ success: false, message: 'token and platform are required' });
      return;
    }

    const u = await User.findById(user._id);
    if (!u) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const tokens = Array.isArray((u as any).expoPushTokens) ? (u as any).expoPushTokens : [];
    const idx = tokens.findIndex((t: any) => t.platform === platform);
    const entry = { token, platform, updatedAt: new Date() } as any;
    if (idx >= 0) {
      tokens[idx] = entry;
    } else {
      tokens.push(entry);
    }
    (u as any).expoPushTokens = tokens;
    await u.save();

    res.json({ success: true, message: 'Push token registered' });
  } catch (err: any) {
    console.error('Error registering push token:', err);
    res.status(500).json({ success: false, message: err?.message || 'Failed to register token' });
  }
});

// Send a simple test push to the authenticated user's tokens
router.post('/push-test', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const tokens: string[] = ((user as any).expoPushTokens || []).map((t: any) => t.token);
    if (!tokens.length) {
      res.status(400).json({ success: false, message: 'No push tokens registered for user' });
      return;
    }

    const { title = 'TAMU Test', body = 'This is a test push', data = {} } = (req.body || {}) as any;
    const result = await sendExpoPushAsync({ to: tokens, title, body, data, sound: 'default', priority: 'high' });

    res.json({ success: true, result });
  } catch (err: any) {
    console.error('Error sending test push:', err);
    res.status(500).json({ success: false, message: err?.message || 'Failed to send test push' });
  }
});

export default router;
