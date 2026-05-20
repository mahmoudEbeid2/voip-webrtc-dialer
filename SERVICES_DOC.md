# 📖 Twilio Voice Service Documentation (`services/twilioService.js`)

This document provides a highly detailed, line-by-line technical explanation of the backend service layer in `services/twilioService.js`. It serves as a developer reference for maintaining, debugging, and extending the Twilio integrations.

---

## 🛠️ Overview & Dependencies

The service layer encapsulates all communication with the Twilio REST API, handles JWT Access Token generation for WebRTC client registration, generates XML-based TwiML responses for voice routing, and manages filesystem persistence for recording history.

### Imports
```javascript
import twilio from 'twilio';
import fs from 'fs';
import path from 'path';
```
* **`twilio`**: The official Twilio Helper Library for Node.js. Used to initialize the REST client and generate tokens/TwiML.
* **`fs`**: Node.js File System module. Used to read/write recording histories to the local disk.
* **`path`**: Node.js Path utility module. Used to resolve absolute file system paths.

### Constants & Initialization
```javascript
const twilioClient = twilio(process.env.Account_SID, process.env.Auth_Token);
const RECORDINGS_FILE = path.resolve('db/recordings.json');
```
* **`twilioClient`**: Instantiates a pre-authenticated Twilio REST API Client wrapper.
* **`RECORDINGS_FILE`**: Formulates the absolute system path to the database file (`db/recordings.json`).

---

## 💾 Database Persistence Helpers (Internal)

These are utility helper functions used to read/write JSON arrays representing the persistent recording history database.

### 1. `readRecordingsFromFile()`
Reads and parses the JSON recordings database.

* **Code Logic:**
  ```javascript
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
  ```
* **Explanation:**
  * Checks if the `recordings.json` file exists on the disk.
  * If it exists, reads its contents using UTF-8 encoding.
  * Parses and returns the JSON string into an array. If empty, falls back to `[]`.
  * Catches any file system errors or parsing exceptions and safely returns an empty array.

### 2. `writeRecordingsToFile(recordings)`
Saves the array of recordings to disk.

* **Code Logic:**
  ```javascript
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
  ```
* **Explanation:**
  * Extracts the parent directory (`db/`) of the database file.
  * Checks if the directory exists; if not, recursively creates it using `fs.mkdirSync`.
  * Serializes the array to a formatted JSON string (2-space indentation) and writes it synchronously to disk.

---

## 🔌 Exported Service Functions

---

### 🔹 `getAccessTokenResponse(rawIdentity)`
Generates a signed JSON Web Token (JWT) authorizing client-side browser endpoints to establish bidirectional WebRTC voice streams with Twilio.

#### Code Snippet
```javascript
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
    incomingAllow: true, 
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
```

#### Parameters Table
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rawIdentity` | `string` | No | Client ID representing the WebRTC user (defaults to `mahmoud_browser`). |

#### Detailed Flow & Mechanics:
1. **Fallback Identification:** Sets the WebRTC caller client identity. If `rawIdentity` is falsy, defaults to `'mahmoud_browser'`.
2. **Environment Validation:** Validates that standard credentials (`API_Key_SID`, `API_Key_Secret`, `TwiML_App_SID`) are set, otherwise throws a configuration error.
3. **Token Instantiation:** Initializes `twilio.jwt.AccessToken` using primary Account SID, and secondary API credentials. This prevents using the master Auth Token on client endpoints.
4. **Voice Authorization Grant:**
   * Creates a `VoiceGrant` instance.
   * Sets `outgoingApplicationSid` to the `TwiML_App_SID` – this maps outgoing call intents originating from the WebRTC client to our webhook application.
   * Sets `incomingAllow: true` to authorize the client to listen to incoming calls.
5. **Token Generation:** Adds the grant to the token and executes `.toJwt()` to construct the signed token string.

#### Return Value
```json
{
  "status": 200,
  "data": {
    "identity": "mahmoud_browser",
    "token": "eyJhbGciOi..."
  }
}
```

---

### 🔹 `getVoiceWebhookResponse(to, from, host)`
Processes routing logic for active calls and returns TwiML (Twilio Markup Language) instructions in XML format.

#### Code Snippet
```javascript
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
```

#### Parameters Table
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `to` | `string` | Yes | The target recipient (e.g. phone number like `+2010...` or a client string like `client:agent`). |
| `from` | `string` | Yes | The origin phone number or WebRTC client identity. |
| `host` | `string` | Yes | The domain host (usually dynamic ngrok hostname) to construct callback webhooks. |

#### Detailed Flow & Mechanics:
1. **Response Setup:** Instantiates a new TwiML VoiceResponse wrapper. Generates `callbackUrl` pointing to the `/recording-callback` endpoint.
2. **Scenario A (Incoming Calls):**
   * If `to` matches `process.env.Twilio_Phone_Number`, it identifies an incoming call.
   * Creates a `<Dial>` node with:
     * `record: 'record-from-answer-dual'` (records both caller and agent into stereo channels).
     * `recordingStatusCallback` pointed to our server's public endpoint.
   * Inside `<Dial>`, adds a `<Client>` node targeting `'mahmoud_browser'`.
3. **Scenario B (Outgoing Browser Calls):**
   * If `to` is populated, the call originates from the WebRTC client.
   * Creates a `<Dial>` node with `callerId` configured to the Twilio number, enabling external callers to see your business ID.
   * If the target starts with `client:`, it dials another browser client; otherwise, it routes to an external `<Number>` node.
4. **Scenario C (Fallback):**
   * If neither is met, a simple `<Say>` node is returned to safely read a voice greeting to the caller.

#### Return Value
```javascript
{
  status: 200,
  type: 'text/xml',
  content: '<Response><Dial record="..." ...><Number>+20...</Number></Dial></Response>'
}
```

---

### 🔹 `getTestCallResponse(host)`
Triggers a programmatic outgoing call to your verified phone number using Twilio's REST API.

#### Code Snippet
```javascript
export async function getTestCallResponse(host) {
  const callbackUrl = `https://${host}/recording-callback`;
  const call = await twilioClient.calls.create({
    url: `https://${host}/voice`,
    to: process.env.My_Phone_Number,
    from: process.env.Twilio_Phone_Number,
    record: true,
    recordingStatusCallback: callbackUrl
  });

  console.log(`[Service] Triggered test call: ${call.sid} (recording active)`);
  return {
    status: 200,
    message: 'call has been sent'
  };
}
```

#### Parameters Table
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `host` | `string` | Yes | The domain host used to construct the recording callback url. |

#### Detailed Flow & Mechanics:
1. Uses `twilioClient.calls.create()` to initiate a REST request.
2. Sets `url` parameter to the `/voice` webhook of the server. This instructs Twilio on what TwiML code to run when the target answers.
3. Sets the destination to `My_Phone_Number` and origin caller ID to `Twilio_Phone_Number`.
4. Enables call recording and passes the callback webhook URL.

---

### 🔹 `handleRecordingCallback(body)`
Receives call recording metadata sent asynchronously by Twilio after processing the audio file, saving details to local storage.

#### Code Snippet
```javascript
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

  recordings.unshift(recordingInfo);
  
  if (recordings.length > 100) {
    recordings.pop();
  }

  writeRecordingsToFile(recordings);
  
  return {
    status: 200,
    message: 'Recording metadata saved successfully.'
  };
}
```

#### Parameters Table
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `body` | `object` | Yes | Parsed JSON object representing the webhook POST payload. |

#### Detailed Flow & Mechanics:
1. **Destructuring:** Extracts the Call SID, Recording URL, Duration (seconds), and Recording SID.
2. **Database Read:** Queries `db/recordings.json` using the internal read helper.
3. **Record Mapping:** Compiles a formatted recording descriptor:
   * Adds `.mp3` extension to the native Twilio `RecordingUrl` to enforce direct audio streaming compatibility on standard browsers.
   * Records a timestamp.
4. **Insertion & Truncation:** Unshifts (inserts at position 0) the new object. Pops (removes) the oldest entry if the database contains over 100 rows.
5. **Database Write:** Writes changes to the filesystem.

---

### 🔹 `getRecordingsList()`
Retrieves all stored records in the filesystem.

#### Code Snippet
```javascript
export function getRecordingsList() {
  return {
    status: 200,
    data: readRecordingsFromFile()
  };
}
```
* **Returns:**
  ```json
  {
    "status": 200,
    "data": [
      {
        "callSid": "CA...",
        "recordingSid": "RE...",
        "duration": "12",
        "url": "https://api.twilio.com/.../RE....mp3",
        "timestamp": "2026-05-20T12:00:00.000Z"
      }
    ]
  }
  ```
