import { 
  getVoiceWebhookResponse, 
  getTestCallResponse, 
  handleRecordingCallback,
  getRecordingsList
} from '../services/twilioService.js';

/**
 * Handles Twilio voice webhook routing POST request
 * POST /voice
 */
export function voiceWebhook(req, res) {
  const { To, From } = req.body;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  
  try {
    const result = getVoiceWebhookResponse(To, From, host);
    res.status(result.status).type(result.type).send(result.content);
  } catch (err) {
    console.error(`[Voice Controller Error] ${err.message}`);
    res.status(500).send('<Response><Say>An error occurred routing this call.</Say></Response>');
  }
}

/**
 * Triggers a test outbound call via Twilio REST API
 * GET /call
 */
export async function makeTestCall(req, res) {
  try {
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const result = await getTestCallResponse(host);
    res.status(result.status).send(result.message);
  } catch (err) {
    console.error(`[Voice Controller Error] ${err.message}`);
    res.status(500).send(`Failed to trigger call: ${err.message}`);
  }
}

/**
 * Handles Twilio recording status callback POST request
 * POST /recording-callback
 */
export function recordingCallback(req, res) {
  try {
    const result = handleRecordingCallback(req.body);
    res.status(result.status).send(result.message);
  } catch (err) {
    console.error(`[Voice Controller Error] ${err.message}`);
    res.status(500).send('Error logging recording metadata.');
  }
}

/**
 * Retrieves the recorded calls list
 * GET /recordings
 */
export function fetchRecordings(req, res) {
  try {
    const result = getRecordingsList();
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error(`[Voice Controller Error] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
}
