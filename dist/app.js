"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const express_1 = __importDefault(require("express"));
const twilio_controller_1 = require("./controllers/twilio.controller");
const twilio_middleware_1 = require("./middleware/twilio.middleware");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Middleware to parse urlencoded bodies (as sent by Twilio)
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json());
// Health check routes - MUST return 200 for Hostinger to consider app healthy
app.get('/', (req, res) => {
    res.status(200).send('OK');
});
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
// Twilio WhatsApp webhook route
app.post('/whatsapp', twilio_middleware_1.validateTwilioSignature, twilio_controller_1.TwilioController.handleWebhook);
// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
exports.default = app;
