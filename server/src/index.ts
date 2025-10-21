import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router as apiRouter } from './routes/api.js';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();

// Middlewares
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', apiRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(config.server.port, () => {
  console.log(`Server running on http://localhost:${config.server.port}`);
  console.log(`CORS enabled for: ${config.server.corsOrigin}`);
  console.log(`Upload limits: ${config.upload.maxFileMB}MB per file, ${config.upload.maxTotalMB}MB total`);
});

