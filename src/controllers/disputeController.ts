import { Request, Response } from 'express';

// TODO: Implement fetching all disputes (admin)
export const getDisputes = async (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement fetching pending disputes
export const getPendingDisputes = async (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement fetching dispute details
export const getDisputeDetails = async (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement creating a new dispute
export const createDispute = async (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement admin resolving a dispute
export const resolveDispute = async (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement adding review notes to a dispute
export const addCommentToDispute = async (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not Implemented' });
};
