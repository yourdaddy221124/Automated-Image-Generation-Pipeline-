import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import pipelineRoutes from './routes/pipelineRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON body parser
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiter: 20 req/10min for development; set max: 5 for production
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes window
  max: process.env.NODE_ENV === 'production' ? 5 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rate Limit Exceeded',
    message: 'Too many generation requests. Please wait before retrying.'
  }
});

// Apply rate limiter specifically to primary generate endpoint
app.use('/api/generate-and-dispatch', apiLimiter);

// Register API Router
app.use('/api', pipelineRoutes);

// Serve static dashboard files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback route to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Topic-to-Image Generation & Dispatch Pipeline Server`);
  console.log(`📡 Server running at: http://localhost:${PORT}`);
  console.log(`🎨 Control Dashboard UI: http://localhost:${PORT}`);
  console.log(`⚡ API Webhook Endpoint: http://localhost:${PORT}/api/generate-and-dispatch`);
  console.log(`=======================================================`);
});
