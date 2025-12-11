import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validateWalletLogin = [
  body('walletAddress').isEthereumAddress().withMessage('A valid wallet address is required'),
  body('signature').isString().withMessage('A valid signature is required'),
  body('nonce').isString().withMessage('A valid nonce is required'),
];

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
