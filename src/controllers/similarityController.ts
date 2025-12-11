import { Request, Response } from 'express';
import logger from '../utils/logger';

// TODO: Implement similarity check against the database
export const checkSimilarity = async (req: Request, res: Response) => {
  logger.debug(`checkSimilarity called with body: ${JSON.stringify(req.body)}`);
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement fetching all matches for a fingerprint
export const getMatches = async (req: Request, res: Response) => {
  logger.debug(`getMatches called with params: ${JSON.stringify(req.params)}`);
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement user-initiated similarity report
export const reportSimilarity = async (req: Request, res: Response) => {
  logger.debug(`reportSimilarity called with body: ${JSON.stringify(req.body)}`);
  res.status(501).json({ message: 'Not Implemented' });
};
