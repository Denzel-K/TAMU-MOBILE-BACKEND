import { IUser } from './index';

declare global {
  namespace Express {
    export interface Request {
      user?: IUser;
      file?: Multer.File;
    }
  }
}
