const User     = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { AUDIT_ACTIONS } = require('../config/constants');

/**
 * Account-level admin operations shared by the users and reports admin
 * endpoints. Each function enforces the safety guards, persists the
 * change, disconnects sockets when needed, and writes an audit log entry.
 *
 * Errors carry a statusCode so asyncHandler/errorHandler return them as
 * safe, user-facing messages.
 */

const httpError = (statusCode, message) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

const countActiveAdmins = () => User.countDocuments({ role: 'admin', isActive: true });

const audit = (actorId, action, targetType, targetId, metadata = {}) =>
    AuditLog.create({ actor: actorId, action, targetType, targetId, metadata });

/**
 * Deactivates (suspends) or reactivates an account.
 * Deactivation immediately disconnects every open socket of that user;
 * `protect` rejects their next API request because it re-reads isActive.
 */
const setUserActive = async ({ actorId, targetUserId, isActive, reason = '', io }) => {
    if (String(actorId) === String(targetUserId)) {
        throw httpError(400, 'You cannot change the status of your own account');
    }

    const user = await User.findById(targetUserId);
    if (!user) throw httpError(404, 'User not found');

    if (user.isActive === isActive) {
        throw httpError(400, `This account is already ${isActive ? 'active' : 'deactivated'}`);
    }

    if (!isActive && user.role === 'admin' && (await countActiveAdmins()) <= 1) {
        throw httpError(400, 'You cannot deactivate the last active admin');
    }

    user.isActive           = isActive;
    user.deactivationReason = isActive ? '' : reason;
    user.deactivatedAt      = isActive ? null : new Date();
    await user.save({ validateModifiedOnly: true });

    if (!isActive && io) {
        io.in(`user_${user._id}`).disconnectSockets(true);
    }

    await audit(
        actorId,
        isActive ? AUDIT_ACTIONS.USER_ACTIVATED : AUDIT_ACTIONS.USER_DEACTIVATED,
        'user',
        user._id,
        isActive ? { userName: user.fullName } : { userName: user.fullName, reason }
    );

    return user;
};

/**
 * Promotes or demotes a user. Admins cannot change their own role, and
 * the last active admin can never be demoted.
 */
const setUserRole = async ({ actorId, targetUserId, role }) => {
    if (String(actorId) === String(targetUserId)) {
        throw httpError(400, 'You cannot change your own role');
    }

    const user = await User.findById(targetUserId);
    if (!user) throw httpError(404, 'User not found');

    if (user.role === role) {
        throw httpError(400, `This user is already ${role === 'admin' ? 'an admin' : 'a regular user'}`);
    }

    if (user.role === 'admin' && role !== 'admin' && user.isActive && (await countActiveAdmins()) <= 1) {
        throw httpError(400, 'You cannot demote the last active admin');
    }

    const previousRole = user.role;
    user.role = role;
    await user.save({ validateModifiedOnly: true });

    await audit(actorId, AUDIT_ACTIONS.ROLE_CHANGED, 'user', user._id, {
        userName: user.fullName, from: previousRole, to: role
    });

    return user;
};

module.exports = { setUserActive, setUserRole, audit, httpError };
