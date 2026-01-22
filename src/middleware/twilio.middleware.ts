import { Request, Response, NextFunction } from 'express';
import { validateRequest } from 'twilio';

// HARDCODED for Hostinger compatibility
const TWILIO_AUTH_TOKEN = '65b1e6958f0aa35cff2df131a1263538';
const PUBLIC_URL = 'https://api.athplan.com';

export const validateTwilioSignature = (req: Request, res: Response, next: NextFunction) => {
    const twilioSignature = req.headers['x-twilio-signature'] as string;
    const url = PUBLIC_URL + req.originalUrl;

    console.log('Twilio Signature Validation:');
    console.log('  URL:', url);
    console.log('  Signature:', twilioSignature);

    if (validateRequest(TWILIO_AUTH_TOKEN, twilioSignature, url, req.body)) {
        console.log('  Result: VALID');
        next();
    } else {
        console.warn('  Result: INVALID - Forbidden');
        res.status(403).send('Forbidden');
    }
};
