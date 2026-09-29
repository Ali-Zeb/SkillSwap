# SkillSwap — Phase A Changes

Summary of the Phase A upgrade (branch `feature/admin-reports-upgrade`), written so the thesis can be updated section by section. Each part lists what was built, how it works, and the design decisions behind it.

---

## 1. Security Hardening

- **HTTP security headers (Helmet)** and **NoSQL-injection protection (express-mongo-sanitize)** are now active. Both libraries were previously installed but never registered. `crossOriginResourcePolicy` is disabled so the separately hosted frontend can load images.
- **Response compression** is enabled; request logging (morgan) runs in development only.
- **Invalid IDs** in URLs now return `400 Invalid id format` instead of `404`.
- **Public profiles** return only a whitelist of public fields; email, role, account status and all security fields are never exposed to other users.
- **Socket.io**: a user can only join the signaling room of a session they take part in, and chat messages are only accepted for an existing, active recipient.

## 2. Data Quality

- **Real-name validation** (register and profile edit, backend and frontend): letters from the Latin and Arabic/Urdu scripts, single spaces, and `.` `'` `-` only between letters; 2–50 characters, no digits. Names are Unicode-normalized and whitespace is collapsed. The rule is enforced only when a name is created or changed, never as a database constraint, so existing accounts with older names are not locked out.
- **Session list consistency**: the "Upcoming" and "Past" queries now cover every session status with no gaps or overlaps. A read-only diagnostic script confirmed that the difference between the Past tab (17) and the database (23) came from other users' sessions, not missing data. Editing a session's date is now only possible through the reschedule flow, which requires the partner's approval.

## 3. Admin Panel & Reporting  *(new thesis section)*

### Reporting
- Users can report another user from their **profile**, the **chat header**, or the **session room**. A report has a reason (harassment, spam, fake profile, scam/fraud, inappropriate content, other) and a description of up to 1,000 characters, which is required for "other".
- Safeguards: no self-reports; a report about a session or message is only accepted if both users were involved; one open report per reporter and target (enforced by a partial unique index); at most 10 reports per user per hour.
- Every active admin receives an in-app notification for each new report. Reporters follow the status and the admin's response on a **My Reports** page.
- Data model — `Report`: reporter, reportedUser, targetType (user/session/message), targetId, reason, description, status (pending/under_review/resolved/dismissed), reviewedBy, resolutionNote, timestamps. It is indexed by status, reported user and reporter.

### Administration
- **Access control**: all `/api/admin` routes require a valid token and the `admin` role. The role is re-read from the database on every request, so a demoted admin loses access immediately even with an older token. Admins are created with `npm run make-admin -- <email>`; no admin credentials exist in the code.
- **Admin panel** (`/admin`, responsive sidebar layout):
  - *Dashboard*: total, active and new users (7 and 30 days), sessions and reports by status, rating count and average.
  - *Users*: search, role and status filters, pagination, deactivate (with a required reason) and reactivate, promote and demote.
  - *Reports*: review queue with status filter; update status and resolution note, optionally deactivating the reported user in the same action.
  - *Sessions*: every session on the platform, filterable by status.
  - *Audit Log*: every admin action.
- **Deactivation** uses the existing `isActive` flag, plus a stored reason and timestamp. A deactivated user is disconnected from real-time features at once, is rejected on their next request, and sees the reason when trying to log in.
- **Guards**: admins cannot deactivate or demote themselves, and the last active admin can never be demoted or deactivated.
- **Audit trail** — `AuditLog`: actor, action, target type and id, metadata, time. It is append-only and written for every role change, (de)activation and report decision.

## 4. Email Verification & Password Reset  *(new thesis section)*

### Email delivery
- An `emailService` with a provider abstraction selected by the `EMAIL_PROVIDER` setting. The production provider is **Brevo's HTTP API**, because the hosting free tier can block SMTP ports. A development provider prints emails to the server log. Other providers can be added without changing callers.
- Branded HTML emails with plain-text alternatives: verification, password reset, and "password changed" confirmation.

### Email verification
- New accounts start unverified. They receive a verification link valid for **24 hours** and cannot log in until they click it. Clicking the link verifies the account and signs the user in.
- Tokens are 256-bit random values. Only their **SHA-256 hash** is stored, so a database leak cannot be used to verify accounts.
- Registrations from **disposable email domains** are rejected.
- "Resend verification" is rate-limited and gives the same response for every email address, so it cannot be used to discover which emails have accounts.
- **Backward compatibility**: only an explicit "unverified" value blocks login, and a one-time migration marks all accounts created before the feature as verified. No existing user is locked out.

### Forgot / reset password
- "Forgot password" always returns the same message, whether or not the email exists, and is rate-limited.
- Reset links are single-use, stored hashed, and expire after **15 minutes**. The new password follows the registration rules and is hashed with bcrypt.
- A reset **signs the user out everywhere**: the account records when the password changed, and every token issued before that moment is rejected by the API and by Socket.io (compared at millisecond precision). Open real-time connections are closed, and a confirmation email is sent.

## 5. Session Recording  *(new thesis section)*

- Previously a recording captured only the recorder's own camera. It now records **the class as a whole**.
- **Video**: a 1280×720 canvas is redrawn about 30 times per second from the live media streams.
  - When someone shares their screen, the screen fills the frame and the cameras appear as small overlays.
  - Otherwise the partner fills the frame, with your own camera as an overlay.
  - Alone in the room, your camera fills the frame.
  - A named placeholder is drawn when a camera is off.
- **Audio**: the Web Audio API mixes the local microphone and the partner's audio into one track. Tracks are added and removed automatically as participants join, leave or mute.
- **Robustness**:
  - Layout changes such as starting or stopping a screen share, or the partner leaving and rejoining, are picked up while recording.
  - Drawing is driven by a Web Worker timer, so the recording keeps running when the tab is in the background.
  - Video sources are warmed up before recording starts.
  - The best supported format is chosen automatically (WebM with VP9/VP8 + Opus).
- **Privacy and UX**: the other participant sees a "… is recording" indicator. The file downloads as `SkillSwap-<session title>-<date>.webm`. Leaving the room mid-recording still saves the file, and all canvas, audio and worker resources are released afterwards.
- The recorder only reads existing streams; the WebRTC connection and signaling are unchanged.
- It was verified in a real Chrome instance with a test that checks the recorded pixels of each layout: camera only, partner, screen share, camera off, and changes during recording.

## 6. Badges (completion of the existing system)

- Badges are now evaluated at every relevant moment: after a **session is completed** (for both participants), after a **rating**, after adding a **teaching skill**, and after **answering a connection request**. Previously only ratings triggered them, so session-based badges were never awarded.
- The profile shows all seven badges: earned ones with their date, locked ones with their requirement and a progress bar. The dashboard shows a compact summary with the next badge. Badge definitions are served by the API rather than duplicated in the frontend.
- **Integrity fixes**:
  - Leaving the session room no longer marks a session completed, which previously allowed badges to be farmed.
  - A session can only be completed by a participant, from scheduled or confirmed status, after its start time, and exactly once (atomic update).
  - A rating must be for the *other* participant of a completed session.
- `npm run reevaluate-badges` awards badges existing users already qualify for and is safe to re-run.

## 7. Operations

New `npm` scripts in `backend/`:
- `make-admin`: promote an existing user to admin.
- `migrate:verify-existing-users`: one-time migration for email verification.
- `reevaluate-badges`: award badges users already qualify for.
- `diagnose:sessions`: read-only session report for one user.

All support `--no-srv` for networks where the MongoDB SRV/TXT DNS lookup times out.

New environment variables, documented in `backend/.env.example` and the README: `EMAIL_PROVIDER`, `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`. `CLIENT_URL` is now also used for email links.

---

## 8. Public Pages & Legal Drafts

- Public pages available without login: **About** (`/about` — problem, how it works, team), **Contact** (`/contact` — the public support form plus support email and response time), **Privacy Policy** (`/privacy`) and **Terms of Service** (`/terms`), each with its own page title and meta description.
- All page text lives in one data file (`frontend/src/content/siteContent.js`) so it can be edited without touching components.
- A shared footer (Explore, Members, Legal, contact details) appears on the landing page, public pages and all member pages; it is never shown inside the admin panel.
- **The Privacy Policy and Terms of Service are plain-language drafts ("Last updated 30 September 2026"). They must be reviewed by a qualified legal professional before any commercial launch.** They cover accounts, email verification, peer-to-peer session video (not stored on our servers), recordings (saved only on the recorder's device; the other participant is notified), uploads stored on Cloudinary, reports and account deactivation, and data-deletion requests via support.
