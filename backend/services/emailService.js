const axios = require('axios');

/**
 * Provider-agnostic email sending.
 *
 * EMAIL_PROVIDER selects the transport:
 *   brevo   — Brevo transactional HTTP API (works on Render's free tier,
 *             which can block outbound SMTP ports). Needs BREVO_API_KEY.
 *   console — development only: logs the email instead of sending it.
 * Defaults to `brevo` when BREVO_API_KEY is set, otherwise `console`
 * outside production. Adding another provider (e.g. SMTP) means adding
 * one function to PROVIDERS — callers never change.
 *
 * Sender identity comes from EMAIL_FROM_NAME / EMAIL_FROM_ADDRESS
 * (the address must be a verified sender in Brevo).
 */

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

const sendViaBrevo = async ({ to, subject, html, text }) => {
    const apiKey = process.env.BREVO_API_KEY;
    const fromAddress = process.env.EMAIL_FROM_ADDRESS;
    if (!apiKey || !fromAddress) {
        throw new Error('Brevo is not configured (BREVO_API_KEY and EMAIL_FROM_ADDRESS are required)');
    }

    try {
        await axios.post(BREVO_ENDPOINT, {
            sender:      { name: process.env.EMAIL_FROM_NAME || 'SkillSwap', email: fromAddress },
            to:          [{ email: to.email, name: to.name || undefined }],
            subject,
            htmlContent: html,
            textContent: text
        }, {
            headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
            timeout: 10000
        });
    } catch (error) {
        // Never log the request (it carries the API key) — only Brevo's
        // status, error code and reason, which name the actual problem
        // (e.g. unrecognised IP address, invalid sender, bad key).
        const status = error.response?.status;
        const code   = error.response?.data?.code;
        const reason = error.response?.data?.message || error.message;
        throw new Error(`Brevo send failed${status ? ` (HTTP ${status}${code ? `, ${code}` : ''})` : ''}: ${reason}`);
    }
};

const sendViaConsole = async ({ to, subject, text }) => {
    console.log(`\n📧 [console email] To: ${to.email}\n   Subject: ${subject}\n${text.split('\n').map((l) => '   ' + l).join('\n')}\n`);
};

const PROVIDERS = {
    brevo:   sendViaBrevo,
    console: sendViaConsole
};

const resolveProvider = () => {
    const configured = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
    if (configured) return configured;
    if (process.env.BREVO_API_KEY) return 'brevo';
    return process.env.NODE_ENV === 'production' ? 'brevo' : 'console';
};

/**
 * Sends one email. Throws on failure so callers decide how to report it.
 *
 * @param {{ to: { email: string, name?: string }, subject: string, html: string, text: string }} message
 */
const sendEmail = async (message) => {
    const name = resolveProvider();
    const provider = PROVIDERS[name];
    if (!provider) {
        throw new Error(`Unknown EMAIL_PROVIDER "${name}"`);
    }
    if (name === 'console' && process.env.NODE_ENV === 'production') {
        throw new Error('The console email provider cannot be used in production');
    }
    await provider(message);
};

/**
 * Logs a warning at startup when emails can't actually be delivered.
 */
const checkEmailConfig = () => {
    const name = resolveProvider();
    if (name === 'console') {
        console.warn('✉️  EMAIL_PROVIDER=console — emails are printed to this log, not sent.');
    } else if (name === 'brevo' && (!process.env.BREVO_API_KEY || !process.env.EMAIL_FROM_ADDRESS)) {
        console.warn('⚠️  Brevo email is not configured (BREVO_API_KEY / EMAIL_FROM_ADDRESS). Verification and reset emails will fail.');
    }
};

module.exports = { sendEmail, checkEmailConfig };
