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
- **AI Assistant** — Powered by Groq API (Llama 3.3 70B) with a local rule-based fallback for reliability
- **Ratings & Reputation** — Post-session rating system to build user credibility
- **Notifications** — In-app notification system for matches, messages, and session requests
- **Profile Management** — Editable profiles with avatar upload (Cloudinary-backed, persists across deploys)
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
   # Fill in your MongoDB URI, JWT secret, Groq API key, and Cloudinary credentials in .env
   npm start
   ```

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

## Project Structure

```
SkillSwap_MERN/
├── backend/
│   ├── config/          # Database, Cloudinary & app configuration
│   ├── controllers/     # Route logic
│   ├── middleware/      # Auth, validation, upload, error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── services/        # AI, notification, reputation logic
│   ├── socket/          # Socket.io event handling
│   └── utils/           # Helper functions
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

- No TURN server configured for WebRTC (works reliably on most networks, but may fail behind strict NATs/firewalls)
- No admin panel
- No password reset flow
- Notifications use REST polling rather than real-time Socket.io push
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
