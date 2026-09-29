# Manual Test Checklist — Phase A (Admin, Reports & Production Upgrade)

Run through this after deploying, or locally with `EMAIL_PROVIDER=console` (emails and their links then appear in the backend log). Use two browsers (or one normal + one private window) for two-user tests. Tick each box as it passes.

**Before testing a deployed build, run once:**
`cd backend && npm run migrate:verify-existing-users` (add `--no-srv` if needed), then `npm run reevaluate-badges`.

---

## 0. Security middleware
- [ ] App loads; login, avatar upload, chat attachment upload and live chat all still work.
- [ ] Browser DevTools → Network → any API response shows headers such as `X-Content-Type-Options: nosniff` and has no `X-Powered-By`.

## 1. Real name validation
- [ ] Register with **"M. Ihtesham"**, **"Ali-Zeb"**, **"علی زیب"** → accepted.
- [ ] Register with **"Ali123"** → "Full name cannot contain numbers".
- [ ] Register with **"@@@"**, **"   "**, **"A"** → clear error, form not submitted.
- [ ] Register with extra spaces **"  Ali    Zeb "** → saved as "Ali Zeb".
- [ ] Edit Profile: change headline only → saves (even for an older account whose name has digits).
- [ ] Edit Profile: change name to "New Name 99" → error; to "Sara O'Brien" → saved.

## 2. Sessions tabs
- [ ] Upcoming + Past counts together equal all of your sessions (compare with `npm run diagnose:sessions -- your@email`).
- [ ] A session whose partner account was deleted still shows (partner "Unknown") without crashing.
- [ ] Reschedule a session → it moves to "Pending approval" until the partner approves.

## 3. Reports
- [ ] Another user's profile → **Report** → reason + description → "Report submitted".
- [ ] Choosing **Other** without a description → error shown.
- [ ] Reporting the same user again while the first report is open → "You already have an open report".
- [ ] Chat header → **Report**; session room header → **Report** → both submit.
- [ ] Own profile → **My Reports** → reports listed with status.
- [ ] Admin account receives a "New Report" notification.
- [ ] Viewing someone else's profile (DevTools → Network → `/users/profile/:id`) shows no email, role or account-status fields.

## 4. Admin panel
- [ ] `npm run make-admin -- your@email` → log out/in → **Admin** link appears in the navbar. A normal user does not see it, and visiting `/admin` redirects them to the dashboard.
- [ ] **Dashboard**: user, session, report and rating numbers match the data; status breakdowns render.
- [ ] **Users**: search by name and email, filter by role/status, paginate.
- [ ] Deactivate a user with a reason → that user is signed out immediately (open their session in another browser); logging in shows the reason; chat/socket stops working.
- [ ] Reactivate → the user can log in again.
- [ ] Make admin / Remove admin works on another user; your own row has no actions.
- [ ] **Reports**: Review → set Under review / Resolved / Dismissed with a note → reporter sees status + note in My Reports. "Resolve + deactivate" deactivates the reported user.
- [ ] **Sessions**: filter by status, paginate.
- [ ] **Audit Log** lists every action above with admin name and details.
- [ ] All admin pages usable at phone width (sidebar collapses into a menu; tables stack).

## 5. Session recording (two participants, Chrome or Edge)
- [ ] **Camera only, partner connected**: Record → talk → Stop → a `SkillSwap-<title>-<date>.webm` downloads showing the partner large and your camera small, with **both voices**.
- [ ] **Alone in the room**: recording shows your camera full-frame.
- [ ] **You share your screen**: the screen is large with both cameras as small overlays.
- [ ] **Partner shares their screen**: their screen is large, your camera small.
- [ ] **Toggle screen share on and off during one recording** → recording continues and the layout switches.
- [ ] **Partner leaves and rejoins during recording** → recording continues; placeholder shown while they're gone.
- [ ] Turn your camera off → placeholder with your name in the recording.
- [ ] Switch to another tab for ~20 s while recording → that part is still recorded (not frozen).
- [ ] The other participant sees "<name> is recording" while recording is on; it disappears on stop.
- [ ] Leaving the room while recording still downloads the file.
- [ ] Video call itself keeps working normally throughout (audio/video/screen share).

## 6. Badges and completion
- [ ] Leaving the session room does **not** mark the session completed.
- [ ] Sessions page: **Mark as completed** appears only after the session's start time; clicking it moves the session to Past.
- [ ] After completing a first session, both participants get the **First Session** badge (notification + profile).
- [ ] Profile shows earned badges (date) and locked badges with requirement and progress bar; Dashboard shows the compact card.
- [ ] Adding a 3rd teaching skill awards **Skill Master**.
- [ ] Ratings: you can rate the partner once per completed session; rating yourself isn't possible.
- [ ] `npm run reevaluate-badges -- --dry-run` lists badges that would be awarded; the real run awards them; a second run awards 0.

## 7. Email verification
- [ ] Register → "Check your inbox" screen → email arrives with SkillSwap branding.
- [ ] Logging in before verifying → "Please verify your email" + **Resend verification email** works.
- [ ] Clicking the link → "Email verified" and you're signed in.
- [ ] Clicking the same link again → "Link invalid or expired" with a resend form.
- [ ] Registering with a `@mailinator.com` / `@yopmail.com` address → blocked.
- [ ] An account created before this release logs in normally (after the migration).

## 8. Forgot / reset password
- [ ] Login → **Forgot password?** → enter email → same confirmation for existing and non-existing emails.
- [ ] Reset email arrives; link opens "Choose a new password".
- [ ] Short password / mismatched confirmation → error.
- [ ] Reset succeeds → "Password updated"; a "password changed" email arrives.
- [ ] Another browser that was logged in is signed out on its next action ("Your password was changed...").
- [ ] Old password fails, new password works.
- [ ] Using the reset link a second time, or after 15 minutes → "Link invalid or expired".
