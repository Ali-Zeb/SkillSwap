const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');
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

// Connect to MongoDB
connectDB();

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin:  process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make io accessible in controllers via req.app.get('io').
// This avoids circular imports — controllers never import server.js.
app.set('io', io);

// Core middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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