const express       = require('express');
const cors          = require('cors');
const dotenv        = require('dotenv');
const helmet        = require('helmet');
const compression   = require('compression');
const morgan        = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const http    = require('http');
const path    = require('path');
const { Server } = require('socket.io');

dotenv.config();

const connectDB                  = require('./config/db');
const registerSocketHandlers     = require('./socket');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { generalLimiter }         = require('./middleware/rateLimiter');

// Route modules
const authRoutes         = require('./routes/auth');
const userRoutes         = require('./routes/users');
const skillRoutes        = require('./routes/skills');
const matchRoutes        = require('./routes/matches');
const requestRoutes      = require('./routes/requests');
const sessionRoutes      = require('./routes/sessions');
const messageRoutes      = require('./routes/messages');
const ratingRoutes       = require('./routes/ratings');
const notificationRoutes = require('./routes/notifications');
const reportRoutes       = require('./routes/reports');
const adminRoutes        = require('./routes/admin');
const badgeRoutes        = require('./routes/badges');

// Connect to MongoDB
connectDB();
require('./services/emailService').checkEmailConfig();

const app    = express();
const server = http.createServer(app);

// Frontend origins allowed to call this API. Both the local dev origin and
// the deployed production origin are allowed unconditionally (not switched
// on NODE_ENV) so the local frontend can be pointed at the live backend
// without a CORS error, and the deployed frontend always works no matter
// which backend it's talking to. CLIENT_URL still works as an extra/
// overriding origin (e.g. a staging deploy) via env var.
const ALLOWED_ORIGINS = [...new Set([
    'http://localhost:5173',
    'https://skillswap-frontend-cy48.onrender.com',
    process.env.CLIENT_URL,
].filter(Boolean))];

const io = new Server(server, {
    cors: {
        origin:  ALLOWED_ORIGINS,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make io accessible in controllers via req.app.get('io').
// This avoids circular imports — controllers never import server.js.
app.set('io', io);

// Security headers. crossOriginResourcePolicy is disabled so the frontend
// (a different origin) can still load legacy /uploads images.
app.use(helmet({ crossOriginResourcePolicy: false }));

// Core middleware
app.use(cors({
    origin: ALLOWED_ORIGINS,
    credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Strip $-prefixed and dotted keys from body/query/params to block
// MongoDB operator injection (e.g. { "email": { "$gt": "" } }).
app.use(mongoSanitize());

if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

app.use(generalLimiter);

// Serve uploaded avatars — absolute path so it works from any working directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success:   true,
        message:   'SkillSwap API is running',
        timestamp: new Date().toISOString()
    });
});

// API routes
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/skills',        skillRoutes);
app.use('/api/matches',       matchRoutes);
app.use('/api/requests',      requestRoutes);
app.use('/api/sessions',      sessionRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/ratings',       ratingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/badges',        badgeRoutes);

// Socket.io
registerSocketHandlers(io);

// Error handling — order matters: notFound first, errorHandler last
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🚀 SkillSwap API running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}/api/health`);
    console.log(`🔌 Socket.io ready`);
    console.log(`🌱 Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err.message);
    server.close(() => process.exit(1));
});

module.exports = { app, server, io };