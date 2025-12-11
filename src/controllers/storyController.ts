import { Request, Response } from 'express';
import logger from '../utils/logger';

// TODO: Implement IP asset registration on Story Protocol
export const registerIp = async (req: Request, res: Response) => {
  logger.debug(`registerIp called with body: ${JSON.stringify(req.body)}`);
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement attaching license terms to an IP
export const attachLicense = async (req: Request, res: Response) => {
  logger.debug(`attachLicense called with body: ${JSON.stringify(req.body)}`);
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement linking a child to a parent IP
export const registerDerivative = async (req: Request, res: Response) => {
  logger.debug(`registerDerivative called with body: ${JSON.stringify(req.body)}`);
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement minting a license for a derivative
export const mintLicenseToken = async (req: Request, res: Response) => {
  logger.debug(`mintLicenseToken called with body: ${JSON.stringify(req.body)}`);
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement fetching IP details from Story Protocol
export const getIp = async (req: Request, res: Response) => {
  logger.debug(`getIp called with params: ${JSON.stringify(req.params)}`);
  res.status(501).json({ message: 'Not Implemented' });
};
