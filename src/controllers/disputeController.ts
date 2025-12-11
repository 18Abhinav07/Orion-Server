import { Request, Response } from 'express';
import logger from '../utils/logger';

// TODO: Implement fetching all disputes (admin)
export const getDisputes = async (req: Request, res: Response) => {
  logger.debug(`getDisputes called`);
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement fetching pending disputes
export const getPendingDisputes = async (req: Request, res: Response) => {
  logger.debug(`getPendingDisputes called`);
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement fetching dispute details
export const getDisputeDetails = async (req: Request, res: Response) => {
  logger.debug(`getDisputeDetails called with params: ${JSON.stringify(req.params)}`);
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement creating a new dispute
export const createDispute = async (req: Request, res: Response) => {
  logger.debug(`createDispute called with body: ${JSON.stringify(req.body)}`);
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement admin resolving a dispute
export const resolveDispute = async (req: Request, res: Response) => {
  logger.debug(`resolveDispute called with params: ${JSON.stringify(req.params)} and body: ${JSON.stringify(req.body)}`);
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement adding review notes to a dispute
export const addCommentToDispute = async (req: Request, res: Response) => {
  logger.debug(`addCommentToDispute called with params: ${JSON.stringify(req.params)} and body: ${JSON.stringify(req.body)}`);
  res.status(501).json({ message: 'Not Implemented' });
};
