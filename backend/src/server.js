const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Serve frontend static files if present
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Routes
app.use('/api/auth',         require('./routes/authRoutes'));
app.use('/api/students',     require('./routes/studentRoutes'));
app.use('/api/courses',      require('./routes/courseRoutes'));
app.use('/api/payments',     require('./routes/paymentRoutes'));
app.use('/api/invoices',     require('./routes/invoiceRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/reports',      require('./routes/reportRoutes'));
app.use('/api/settings',     require('./routes/settingsRoutes'));

app.get('/', (req, res) => res.json({ message: 'Job Way Tech API Running' }));

// Serve index.html for any non-API route (SPA fallback)
// Serve favicon from frontend logo (prevents 404 for /favicon.ico)
app.get('/favicon.ico', (req, res) => {
  return res.sendFile(path.join(frontendPath, 'logo.png'));
});

app.get('*', (req, res) => {
	if (req.path.startsWith('/api')) return res.status(404).json({ message: 'API route not found' });
	res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = Number(process.env.PORT) || 5000;

const startServer = (port) => {
  const server = app.listen(port, () => console.log(`Server running on port ${port}`));

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is busy. Trying ${port + 1}...`);
      server.removeAllListeners('error');
      startServer(port + 1);
      return;
    }

    console.error('Server failed to start:', error.message);
    process.exit(1);
  });
};

startServer(PORT);
