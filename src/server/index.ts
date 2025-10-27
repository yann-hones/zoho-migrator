import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';
import { zohoRouter } from './routes/zoho';
import { sharepointRouter } from './routes/sharepoint';
import { transferRouter } from './routes/transfer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Routes
app.use('/api/zoho', zohoRouter);
app.use('/api/sharepoint', sharepointRouter);
app.use('/api/transfer', transferRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Zoho to SharePoint File Transfer API`);
});

export default app;
