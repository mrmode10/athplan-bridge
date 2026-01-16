import { Request, Response, NextFunction } from 'express';
import { validateRequest } from 'twilio';

export const validateTwilioSignature = (req: Request, res: Response, next: NextFunction) => {
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioSignature = req.headers['x-twilio-signature'] as string;
    const url = process.env.PUBLIC_URL + req.originalUrl; // Adjust based on how you host

    if (!twilioAuthToken) {
        console.error('TWILIO_AUTH_TOKEN missing in env');
        return res.status(500).send('Internal Server Error');
    }

    // If in development/local and no tunnel, we might want to skip or mock
    if (process.env.NODE_ENV === 'development' && !process.env.PUBLIC_URL) {
        console.warn('Skipping Twilio signature validation in dev mode (no PUBLIC_URL)');
        return next();
    }

    if (validateRequest(twilioAuthToken, twilioSignature, url, req.body)) {
        next();
    } else {
        console.warn('Invalid Twilio Signature');
        res.status(403).send('Forbidden');
    }
};
