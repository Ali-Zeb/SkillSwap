# SkillSwap

**An AI-powered peer skill exchange platform** where users can teach what they know and learn what they don't — built as a Final Year Project (BS Computer Science, University of Peshawar).

> Users list skills they can teach and skills they want to learn, get matched with compatible peers, chat and schedule live video sessions, and rate each other after each exchange — with an AI assistant guiding the experience.

## 🔗 Live Demo

- **App**: [https://skillswap-frontend-cy48.onrender.com](https://skillswap-frontend-cy48.onrender.com)
- **API**: [https://skillswap-ou18.onrender.com/api/health](https://skillswap-ou18.onrender.com/api/health)

> ⚠️ **Note**: Hosted on Render's free tier. The first request after a period of inactivity may take 30–50 seconds to wake the servers up — this is normal, subsequent requests are fast.

---

## Features

- **User Authentication** — JWT-based signup/login with bcrypt password hashing
- **Skill Matching** — Peer matching engine based on skills offered vs. skills wanted
- **Real-time Messaging** — Socket.io powered chat between matched users
- **Live Video Sessions** — WebRTC-based video calling for skill exchange sessions, in a custom-built session room with a dark, Google Meet–style interface
- **AI Assistant** — Powered by the Groq API (default model `openai/gpt-oss-120b`, configurable via `GROQ_MODEL`) with a local rule-based fallback for reliability
- **Ratings & Reputation** — Post-session rating system to build user credibility
- **Notifications** — In-app notification system for matches, messages, and session requests
- **Profile Management** — Editable profiles with avatar upload (Cloudinary-backed, persists across deploys) and real-name validation (Latin + Urdu/Arabic letters)
- **Email Verification & Password Reset** — Verification link on sign-up (disposable domains blocked), forgot/reset password with single-use hashed tokens; a reset signs the user out everywhere
- **Session Recording** — Records the whole class (shared screen, both cameras, both voices) into a downloadable `.webm`; the other participant is notified
- **Badges** — Seven achievement badges awarded after sessions, ratings, skills and request replies, with earned/locked progress on the profile
- **Reports & Admin Panel** — Users can report profiles, chats or sessions; admins get a dashboard, user management (roles, deactivation), report review, sessions and an audit log of every admin action
- **Fully Responsive UI** — Built with React 19 + Tailwind CSS

---

## Tech Stack

**Frontend**
- React 19 + Vite
- Redux Toolkit (state management)
- Tailwind CSS
- Socket.io Client
- WebRTC

**Backend**
- Node.js + Express.js
- MongoDB Atlas + Mongoose
- Socket.io
- JWT Authentication
- bcrypt (password hashing)
- Multer + Cloudinary (avatar uploads)
- Groq API (AI assistant)

**Deployment**
- Frontend: Render (Static Site)
- Backend: Render (Web Service)
- Database: MongoDB Atlas
- Media Storage: Cloudinary

---

## Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account (or local MongoDB instance)
- Groq API key ([console.groq.com](https://console.groq.com))
- Cloudinary account ([cloudinary.com](https://cloudinary.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ali-Zeb/SkillSwap.git
   cd SkillSwap
   ```

2. **Backend setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Fill in your MongoDB URI, JWT secret, Groq API key, Cloudinary and Brevo credentials in .env
   npm start
   ```
   For local development you can leave the Brevo values empty and set `EMAIL_PROVIDER=console` — verification and reset emails (with their links) are then printed in the backend log instead of being sent.

3. **Frontend setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Fill in your backend API URL in .env
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.

---

## Environment Configuration

`frontend/.env` is gitignored and used for **local development only** — it should always point at `http://localhost:5000`, matching `frontend/.env.example`. This is expected to differ from the live site: Vite bakes `VITE_API_URL`/`VITE_SOCKET_URL` into the built JS at **build time**, not read at runtime, so a committed `.env` wouldn't do anything useful for the deployed app anyway — Render rebuilds the frontend from source on every deploy.

**Production** values are set directly in Render's dashboard, under the frontend static site's **Environment** settings — not in any file in this repo:

| Variable | Local (`frontend/.env`) | Production (Render dashboard) |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | `https://skillswap-ou18.onrender.com/api` |
| `VITE_SOCKET_URL` | `http://localhost:5000` | `https://skillswap-ou18.onrender.com` |

The backend's CORS config (`backend/server.js`) allows both the local (`http://localhost:5173`) and production (`https://skillswap-frontend-cy48.onrender.com`) frontend origins at all times — so pointing a local frontend dev server at the live backend (or vice versa) never hits a CORS error.

### Backend environment variables

All are listed with placeholders in `backend/.env.example`. Set real values in `backend/.env` locally and in the Render dashboard for production — never commit them.

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET`, `JWT_EXPIRE` | Token signing secret and lifetime (default `30d`) |
| `CLIENT_URL` | Frontend URL — extra CORS origin **and** base for links in emails (e.g. `https://skillswap-frontend-cy48.onrender.com`) |
| `GROQ_API_KEY`, `GROQ_MODEL` | AI assistant |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Avatar and chat file storage |
| `EMAIL_PROVIDER` | `brevo` (production) or `console` (development: prints emails to the log) |
| `BREVO_API_KEY` | Brevo API key (Brevo → SMTP & API → API Keys) |
| `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` | Sender shown on emails; the address must be a verified sender in Brevo |

### Email setup (Brevo)

Render's free tier can block outbound SMTP ports, so SkillSwap sends email through Brevo's HTTP API.

1. Create a free account at [brevo.com](https://www.brevo.com).
2. **Senders & IPs → Senders → Add a sender**: add the address you send from and confirm it from Brevo's email. No domain is required.
3. **SMTP & API → API Keys → Generate a new API key.**
4. Set `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS` (the verified sender) and `EMAIL_FROM_NAME` in `backend/.env` and in Render.
5. Make sure `CLIENT_URL` in Render is the deployed frontend URL so email links open the live site.

The backend logs a warning on startup if email isn't configured.

---

## Maintenance Scripts

Run from `backend/`. Each reads `MONGO_URI` from `backend/.env`. If connecting to Atlas fails with `queryTxt ETIMEOUT` (some networks block the DNS TXT lookup that `mongodb+srv://` needs), add `--no-srv`.

| Command | What it does |
|---|---|
| `npm run make-admin -- you@example.com` | Promotes an **existing, registered** account to admin and marks its email verified (so the admin can always log in). No admin credentials are hardcoded anywhere. |
| `npm run email:test -- you@example.com` | Sends a test email with the configured provider and prints the exact error if it fails (never prints the API key). |
| `npm run migrate:verify-existing-users` | **Run once when deploying email verification.** Marks every account created before the feature as verified (`--dry-run` to preview). |
| `npm run reevaluate-badges` | Awards badges users already qualify for (e.g. First Session for past sessions). `--dry-run` previews, `--notify` also sends "badge earned" notifications. Safe to re-run. |
| `npm run diagnose:sessions -- you@example.com` | Read-only: lists a user's sessions and which Sessions tab each appears in. |

### Becoming an admin

1. Register the account in the app and verify its email.
2. `cd backend && npm run make-admin -- that@email.com` (add `--no-srv` if needed).
3. Log out and back in. An **Admin** link appears in the navbar and opens `/admin`.

Admins cannot deactivate or demote themselves, and the last active admin can never be demoted or deactivated. Every admin action is written to the audit log.

---

## Project Structure

```
SkillSwap_MERN/
├── backend/
│   ├── config/          # Database, Cloudinary & app configuration
│   ├── controllers/     # Route logic
│   ├── middleware/      # Auth, validation, upload, error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── scripts/         # One-off maintenance scripts (make-admin, migrations)
│   ├── services/        # AI, notification, reputation, email, admin logic
│   ├── socket/          # Socket.io event handling
│   └── utils/           # Helpers, email templates, token utilities
└── frontend/
    └── src/
        ├── api/          # Axios instance
        ├── app/          # Redux store
        ├── components/   # Reusable UI components
        ├── features/     # Redux slices
        ├── hooks/        # Custom hooks
        ├── utils/        # Config & helper functions
        └── pages/        # Route-level pages
```

---

## Known Limitations

This project was built as an academic FYP, and some production-scale features are intentionally out of scope for now:

- WebRTC uses the free public Open Relay TURN service — no uptime/bandwidth guarantee; a dedicated TURN server is the next step for scale
- Session recordings are saved on the recording user's device, not uploaded
- Hosted on free-tier infrastructure, so cold starts are expected after inactivity

---

## Author

**AliZeb** — MERN Stack Developer
Co-developed with M. Ihtesham
Supervised by Dr. Nosheen Fayaz, University of Peshawar

- GitHub: [@Ali-Zeb](https://github.com/Ali-Zeb)

---

## License

This project is open for educational and portfolio purposes.
