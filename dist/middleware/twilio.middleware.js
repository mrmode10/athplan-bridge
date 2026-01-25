"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTwilioSignature = void 0;
const twilio_1 = require("twilio");
// HARDCODED for Hostinger compatibility
const TWILIO_AUTH_TOKEN = '68f572c98ea214fba9bc87a8fb36a1fb';
const PUBLIC_URL = 'https://api.athplan.com';
const validateTwilioSignature = (req, res, next) => {
    const twilioSignature = req.headers['x-twilio-signature'];
    const url = PUBLIC_URL + req.originalUrl;
    console.log('Twilio Signature Validation:');
    console.log('  URL:', url);
    console.log('  Signature:', twilioSignature);
    if ((0, twilio_1.validateRequest)(TWILIO_AUTH_TOKEN, twilioSignature, url, req.body)) {
        console.log('  Result: VALID');
        next();
    }
    else {
        console.warn('  Result: INVALID - Forbidden');
        res.status(403).send('Forbidden');
    }
};
exports.validateTwilioSignature = validateTwilioSignature;
