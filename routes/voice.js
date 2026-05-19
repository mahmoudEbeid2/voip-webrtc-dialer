import express from 'express';
import { 
  voiceWebhook, 
  makeTestCall, 
  recordingCallback, 
  fetchRecordings 
} from '../controllers/voiceController.js';

const router = express.Router();

// Define Voice Webhook routing and call trigger routes
router.post('/voice', voiceWebhook);
router.get('/call', makeTestCall);
router.post('/recording-callback', recordingCallback);
router.get('/recordings', fetchRecordings);

export default router;
