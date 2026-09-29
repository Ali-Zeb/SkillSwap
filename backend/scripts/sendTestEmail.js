/**
 * Sends one test email through the configured provider and reports the
 * exact result — use it to diagnose why verification/reset emails are
 * not arriving. Never prints the API key.
 *
 * Usage (from backend/):
 *   npm run email:test -- you@example.com
 *
 * Uses EMAIL_PROVIDER / BREVO_API_KEY / EMAIL_FROM_ADDRESS / EMAIL_FROM_NAME
 * from backend/.env (or the environment, e.g. a Render shell).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const emailService = require('../services/emailService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const main = async () => {
    const to = (process.argv[2] || '').trim();
    if (!EMAIL_REGEX.test(to)) {
        console.error('Usage: npm run email:test -- <recipient email>');
        process.exitCode = 1;
        return;
    }

    const provider = process.env.EMAIL_PROVIDER || (process.env.BREVO_API_KEY ? 'brevo (auto)' : 'console (auto)');
    console.log('Provider          :', provider);
    console.log('BREVO_API_KEY     :', process.env.BREVO_API_KEY ? 'set' : 'NOT SET');
    console.log('EMAIL_FROM_ADDRESS:', process.env.EMAIL_FROM_ADDRESS || 'NOT SET');
    console.log('EMAIL_FROM_NAME   :', process.env.EMAIL_FROM_NAME || '(default: SkillSwap)');
    console.log('CLIENT_URL        :', process.env.CLIENT_URL || 'NOT SET (links would point to localhost)');

    try {
        await emailService.sendEmail({
            to:      { email: to },
            subject: 'SkillSwap test email',
            html:    '<p>This is a test email from SkillSwap. If you can read this, email delivery works.</p>',
            text:    'This is a test email from SkillSwap. If you can read this, email delivery works.'
        });
        console.log(`\n✅ Accepted by the provider. Check ${to} (and its spam folder).`);
    } catch (error) {
        console.error('\n❌ Sending failed:', error.message);
        console.error('\nCommon causes:');
        console.error(' - "unrecognised IP address": Brevo → Security → Authorised IPs → deactivate blocking (Render IPs change).');
        console.error(' - "Key not found" / unauthorized: wrong or revoked BREVO_API_KEY.');
        console.error(' - sender not valid: EMAIL_FROM_ADDRESS must be a verified sender in Brevo → Senders.');
        console.error(' - account not activated: Brevo may need to activate transactional email for new accounts.');
        process.exitCode = 1;
    }
};

main();
