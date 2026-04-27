const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ──
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const chapterRoutes = require('./routes/chapters');
const aiRoutes = require('./routes/ai');
const downloadRoutes = require('./routes/download');

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/download', downloadRoutes);

// ── Base Route ──
app.get('/', (req, res) => {
  res.json({ message: 'ProjectAI API is running successfully!' });
});

// ── Error Handler ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

// ── Start Server ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`ProjectAI server is running on port ${PORT}`);
});