import 'dotenv/config';
import express from 'express';
import tokenRouter from './routes/token.js';
import voiceRouter from './routes/voice.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static HTML/CSS/JS files from the "public" folder
app.use(express.static('public'));

// Parse URL-encoded bodies (essential for Twilio webhook POST requests)
app.use(express.urlencoded({ extended: false }));

// Mount routes
app.use('/token', tokenRouter);
app.use('/', voiceRouter); // handles /voice and /call

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to test the VoIP Dialer`);
});
