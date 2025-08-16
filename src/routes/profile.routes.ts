import express, { RequestHandler } from 'express';
import { getProfile, updateProfile, updateSocialLinks, uploadProfilePhoto, changePassword, logoutAllSessions, deleteAccount } from '../controllers/profile.controller';
import { authenticate as protect } from '../middleware/auth';
import upload from '../middleware/upload';

const router = express.Router();

// All routes in this file are protected
router.use(protect);

router.route('/')
  .get(getProfile)
  .put(updateProfile);

router.route('/social-links')
  .put(updateSocialLinks);

// Multer's typings can be incompatible with Express 4/5 typings in strict mode.
// Cast the middleware to RequestHandler to satisfy the router overload.
const uploadSingleProfilePhoto: RequestHandler = (upload.single('profilePhoto') as unknown) as RequestHandler;

router.route('/photo')
  .post(uploadSingleProfilePhoto, uploadProfilePhoto);

// Security
router.post('/security/change-password', changePassword);
router.post('/security/logout-all', logoutAllSessions);

// Account deletion
router.delete('/', deleteAccount);

export default router;
