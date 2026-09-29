/**
 * Re-runs the reputation + badge pipeline for every user, awarding any
 * badges they already qualify for (e.g. First Session for users whose
 * sessions were completed before badges ran on completion).
 *
 * Usage (from backend/):
 *   npm run reevaluate-badges
 *   npm run reevaluate-badges -- --dry-run     (report only, write nothing)
 *   npm run reevaluate-badges -- --notify      (also send "badge earned" notifications)
 *   add --no-srv if connecting fails with "queryTxt ETIMEOUT"
 *
 * Idempotent: badges a user already holds are never duplicated.
 */
const path     = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const srvToStandardUri = require('./srvToStandardUri');
const User              = require('../models/User');
const reputationService = require('../services/reputationService');

mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);

const main = async () => {
    const args   = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const notify = args.includes('--notify');

    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set (expected in backend/.env).');
        process.exitCode = 1;
        return;
    }

    const uri = args.includes('--no-srv') ? await srvToStandardUri(process.env.MONGO_URI) : process.env.MONGO_URI;
    await mongoose.connect(uri, { autoIndex: false, autoCreate: false });

    const users = await User.find({}).select('_id fullName badges').lean();
    let awarded = 0;

    for (const user of users) {
        if (dryRun) {
            const progress = await reputationService.getBadgeProgress(user._id);
            const held     = new Set((user.badges || []).map((b) => b.type));
            const pending  = progress.filter((b) => b.progress >= 1 && !held.has(b.type)).map((b) => b.label);
            if (pending.length) {
                awarded += pending.length;
                console.log(`${user.fullName}: would award ${pending.join(', ')}`);
            }
            continue;
        }
        const newTypes = await reputationService.evaluateUserBadges(user._id, null, { notify });
        if (newTypes.length) {
            awarded += newTypes.length;
            console.log(`${user.fullName}: awarded ${newTypes.join(', ')}`);
        }
    }

    console.log(`\n${dryRun ? 'Dry run — ' : ''}${users.length} users checked, ${awarded} badge(s) ${dryRun ? 'would be ' : ''}awarded.`);
};

main()
    .catch((err) => {
        console.error('reevaluate-badges failed:', err.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
