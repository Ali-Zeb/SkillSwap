/**
 * Promotes an existing account to admin.
 *
 * Usage (from backend/):
 *   npm run make-admin -- user@example.com
 *   npm run make-admin -- user@example.com --no-srv   (if DNS TXT lookups time out)
 *
 * The account must already exist (register it in the app first). No admin
 * credentials are ever created or stored by this script. Changes only the
 * `role` field of that one user.
 */
const path     = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const srvToStandardUri = require('./srvToStandardUri');

mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const main = async () => {
    const args  = process.argv.slice(2);
    const noSrv = args.includes('--no-srv');
    const email = (args.find((a) => !a.startsWith('--')) || '').trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
        console.error('Usage: npm run make-admin -- <email of an existing account> [--no-srv]');
        process.exitCode = 1;
        return;
    }
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set (expected in backend/.env).');
        process.exitCode = 1;
        return;
    }

    const uri = noSrv ? await srvToStandardUri(process.env.MONGO_URI) : process.env.MONGO_URI;
    await mongoose.connect(uri, { autoIndex: false, autoCreate: false });
    const users = mongoose.connection.db.collection('users');

    const user = await users.findOne({ email }, { projection: { fullName: 1, role: 1, isActive: 1 } });
    if (!user) {
        console.error('No account found with that email. Register it in the app first.');
        process.exitCode = 1;
        return;
    }
    if (user.role === 'admin') {
        console.log(`${user.fullName} is already an admin. Nothing changed.`);
        return;
    }

    await users.updateOne({ _id: user._id }, { $set: { role: 'admin' } });
    console.log(`✅ ${user.fullName} is now an admin. Log in again (or refresh) to see the Admin link.`);
    if (user.isActive === false) {
        console.log('⚠️  Note: this account is deactivated, so it cannot log in until it is reactivated.');
    }
};

main()
    .catch((err) => {
        console.error('make-admin failed:', err.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
