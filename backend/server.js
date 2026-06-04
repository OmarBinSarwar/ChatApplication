require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./database/db');

const { router: authRouter } = require('./routes/auth');
const usersRouter = require('./routes/users');
const conversationsRouter = require('./routes/conversations');
const messagesRouter = require('./routes/messages');
const setupSocket = require('./socket/socket');

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Middleware
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl)
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV === 'production') {
      const formattedFrontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : '';
      const formattedOrigin = origin.replace(/\/$/, '');
      if (formattedOrigin === formattedFrontendUrl) {
        return callback(null, true);
      } else {
        return callback(new Error(`Not allowed by CORS in production. Origin: ${origin}, FRONTEND_URL: ${process.env.FRONTEND_URL}`));
      }
    }
    
    // In development, allow localhost, 127.0.0.1, and local network IPs
    if (
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') || 
      origin.startsWith('http://192.168.') || 
      origin.startsWith('http://10.') || 
      origin.startsWith('http://172.')
    ) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS in development'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/messages', messagesRouter);

// Initialize WebSockets
setupSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
