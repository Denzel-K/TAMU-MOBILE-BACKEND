import multer, { StorageEngine } from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';
import { Request } from 'express';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'kikapu-profile-photos',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    public_id: (req: Request, file: Express.Multer.File) => {
      // Create a unique public ID for the image
      // req.user is available because of our custom express.d.ts file
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `profile-${req.user!._id}-${uniqueSuffix}`;
    },
  } as any, // The type definitions for params are not perfectly aligned with the library
});

// CloudinaryStorage type is compatible at runtime but may not structurally type-match Multer's StorageEngine.
// Cast to StorageEngine to satisfy TypeScript while keeping runtime behavior unchanged.
const upload = multer({ storage: storage as unknown as StorageEngine });

export default upload;
