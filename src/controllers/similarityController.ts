import { Request, Response } from 'express';

// TODO: Implement similarity check against the database
export const checkSimilarity = async (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement fetching all matches for a fingerprint
export const getMatches = async (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not Implemented' });
};

// TODO: Implement user-initiated similarity report
export const reportSimilarity = async (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not Implemented' });
};
