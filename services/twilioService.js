import twilio from 'twilio';
import fs from 'fs';
import path from 'path';

const twilioClient = twilio(process.env.Account_SID, process.env.Auth_Token);

// Path to store recordings JSON file
const RECORDINGS_FILE = path.resolve('db/recordings.json');

/**
 * Reads recordings from the JSON file.
 * @returns {Array} Array of recording objects
 */
function readRecordingsFromFile() {
  try {
    if (fs.existsSync(RECORDINGS_FILE)) {
      const data = fs.readFileSync(RECORDINGS_FILE, 'utf8');
      return JSON.parse(data || '[]');
    }
  } catch (err) {
    console.error('Error reading recordings from file:', err);
  }
  return [];
}

/**
 * Writes recordings to the JSON file.
 * @param {Array} recordings - Array of recording objects to persist
 */
function writeRecordingsToFile(recordings) {
  try {
    const dir = path.dirname(RECORDINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(RECORDINGS_FILE, JSON.stringify(recordings, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing recordings to file:', err);
  }
}

// Business logic to generate Access Token response payload.
export function getAccessTokenResponse(rawIdentity) {
  const identity = rawIdentity || 'mahmoud_browser';

  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  if (!process.env.API_Key_SID || !process.env.API_Key_Secret || !process.env.TwiML_App_SID) {
    throw new Error('API Keys or TwiML App SID are not configured in environment variables.');
  }

  const token = new AccessToken(
    process.env.Account_SID,
    process.env.API_Key_SID,
    process.env.API_Key_Secret,
    { identity: identity }
  );

  token.identity = identity;

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TwiML_App_SID,
    incomingAllow: true, // Enables incoming voice calls
  });

  token.addGrant(voiceGrant);

  return {
    status: 200,
    data: {
      identity: identity,
      token: token.toJwt()
    }
  };
}

// Business logic to process Voice webhook and return TwiML XML response structure.
export function getVoiceWebhookResponse(to, from, host) {
  const twiml = new twilio.twiml.VoiceResponse();
  const callbackUrl = `https://${host}/recording-callback`;

  // Scenario A: Incoming call to Twilio phone number
  if (to === process.env.Twilio_Phone_Number) {
    console.log(`[Service] Routing incoming call from ${from} to browser client (recording active)...`);
    const dial = twiml.dial({
      record: 'record-from-answer-dual',
      recordingStatusCallback: callbackUrl
    });
    dial.client('mahmoud_browser');
  } 
  // Scenario B: Outgoing call from browser client
  else if (to) {
    console.log(`[Service] Routing outgoing call from browser client to ${to} (recording active)...`);
    const dial = twiml.dial({
      callerId: process.env.Twilio_Phone_Number,
      record: 'record-from-answer-dual',
      recordingStatusCallback: callbackUrl
    });

    if (to.startsWith('client:')) {
      dial.client(to.replace('client:', ''));
    } else {
      dial.number(to);
    }
  } 
  // Scenario C: No destination specified
  else {
    twiml.say('Welcome. No destination was specified for this call.');
  }

  return {
    status: 200,
    type: 'text/xml',
    content: twiml.toString()
  };
}

// Business logic to trigger test outbound call using REST API.
export async function getTestCallResponse(host) {
  const callbackUrl = `https://${host}/recording-callback`;
  const call = await twilioClient.calls.create({
    url: `https://${host}/voice`,
    to: process.env.My_Phone_Number,
    from: process.env.Twilio_Phone_Number,
    record: true, // Enable recording for REST calls
    recordingStatusCallback: callbackUrl
  });

  console.log(`[Service] Triggered test call: ${call.sid} (recording active)`);
  return {
    status: 200,
    message: 'call has been sent'
  };
}

/**
 * Business logic to handle recording callback from Twilio.
 * @param {Object} body - Request body containing Twilio recording details
 */
export function handleRecordingCallback(body) {
  const { CallSid, RecordingUrl, RecordingDuration, RecordingSid } = body;
  
  const recordings = readRecordingsFromFile();
  
  const recordingInfo = {
    callSid: CallSid,
    recordingSid: RecordingSid,
    duration: RecordingDuration,
    url: `${RecordingUrl}.mp3`,
    timestamp: new Date().toISOString()
  };

  // Add new recording to the beginning of the list
  recordings.unshift(recordingInfo);
  
  // Keep only the last 100 recordings in memory/JSON
  if (recordings.length > 100) {
    recordings.pop();
  }

  writeRecordingsToFile(recordings);

  console.log('\n==============================================');
  console.log('🔴 [Twilio Call Recording Saved to JSON]');
  console.log(`Call SID:       ${CallSid}`);
  console.log(`Recording SID:  ${RecordingSid}`);
  console.log(`Duration:       ${RecordingDuration} seconds`);
  console.log(`Listen/Download: ${RecordingUrl}.mp3`);
  console.log('==============================================\n');
  
  return {
    status: 200,
    message: 'Recording metadata saved successfully.'
  };
}

/**
 * Retrieves the persisted list of recordings from the JSON file.
 * @returns {Object} Object containing status and list of recordings
 */
export function getRecordingsList() {
  return {
    status: 200,
    data: readRecordingsFromFile()
  };
}
