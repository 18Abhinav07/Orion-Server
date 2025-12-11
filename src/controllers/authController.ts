import { Request, Response } from 'express';
import logger from '../utils/logger';

// TODO: Implement wallet login with signature verification
export const walletLogin = async (req: Request, res: Response) => {
  logger.debug(`walletLogin called with body: ${JSON.stringify(req.body)}`);
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement wallet verification check
export const walletVerify = async (req: Request, res: Response) => {
  logger.debug(`walletVerify called with body: ${JSON.stringify(req.body)}`);
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement fetching user profile
export const getProfile = async (req: Request, res: Response) => {
  // @ts-ignore
  logger.debug(`getProfile called for user: ${JSON.stringify(req.user)}`);
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement logout
export const logout = async (req: Request, res: Response) => {
  logger.debug('logout called');
  res.status(501).json({ message: 'Not Implemented' });
};
