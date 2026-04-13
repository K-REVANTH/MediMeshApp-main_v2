require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medimesh-user-db';

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'medimesh-user' }));

// ─── MongoDB connection with retry logic ────────────────
const MAX_RETRIES = 5;
const INITIAL_DELAY = 3000;

async function connectWithRetry(retries = 0) {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('📦 User DB connected');
    app.listen(PORT, () => console.log(`👤 medimesh-user running on port ${PORT}`));
  } catch (err) {
    if (retries < MAX_RETRIES) {
      const delay = INITIAL_DELAY * Math.pow(2, retries);
      console.warn(`⚠️ DB connection attempt ${retries + 1} failed: ${err.message}. Retrying in ${delay / 1000}s...`);
      setTimeout(() => connectWithRetry(retries + 1), delay);
    } else {
      console.error('❌ DB connection failed after max retries:', err.message);
      process.exit(1);
    }
  }
}

connectWithRetry();
