/**
 * One-off migration for email verification: marks every user that has no
 * isEmailVerified value (all accounts created before the feature) as
 * verified, so nobody is locked out. Accounts registered afterwards
 * (explicitly false) are left alone. Safe to run more than once.
 *
 * Usage (from backend/):
 *   npm run migrate:verify-existing-users
 *   npm run migrate:verify-existing-users -- --dry-run
 *   add --no-srv if connecting fails with "queryTxt ETIMEOUT"
 */
const path     = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const srvToStandardUri = require('./srvToStandardUri');

mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);

const main = async () => {
    const args   = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set (expected in backend/.env).');
        process.exitCode = 1;
        return;
    }

    const uri = args.includes('--no-srv') ? await srvToStandardUri(process.env.MONGO_URI) : process.env.MONGO_URI;
    await mongoose.connect(uri, { autoIndex: false, autoCreate: false });
    const users  = mongoose.connection.db.collection('users');
    const filter = { isEmailVerified: { $exists: false } };

    const pending = await users.countDocuments(filter);
    if (dryRun) {
        console.log(`Dry run — ${pending} existing user(s) would be marked as verified.`);
        return;
    }

    const result = await users.updateMany(filter, { $set: { isEmailVerified: true } });
    console.log(`✅ Marked ${result.modifiedCount} existing user(s) as verified.`);
};

main()
    .catch((err) => {
        console.error('Migration failed:', err.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
