# 📖 Developer Reference: `services/twilioService.js`

This guide serves as a developer reference for `services/twilioService.js`. Each function is displayed as a complete, unbroken code block, followed directly by a detailed explanation of its statements, variables, and Twilio API integrations.

---

## 🔹 `readRecordingsFromFile()`

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

### Explanation & Reference Guide:

* **`function readRecordingsFromFile() {`**
  Declares the private helper function inside the module. It takes no arguments and returns a parsed JavaScript Array of metadata objects.
* **`try {`**
  Opens a try-catch block to handle disk read operations safely, preventing I/O issues from crashing the server.
* **`if (fs.existsSync(RECORDINGS_FILE)) {`**
  Checks if the recordings database file actually exists on the disk. This check avoids throwing errors if the file doesn't exist yet.
* **`const data = fs.readFileSync(RECORDINGS_FILE, 'utf8');`**
  Synchronously reads the file contents from disk. The `'utf8'` encoding argument converts the raw binary data from the disk directly into a readable text string.
* **`return JSON.parse(data || '[]');`**
  Parses the JSON text string into a live JavaScript array of objects. The logical OR `|| '[]'` is a fallback: if the file is empty (0 bytes), it parses `'[]'` to return an empty array instead of throwing a parsing error.
* **`} catch (err) { console.error('Error reading recordings from file:', err); }`**
  Catches any folder checking, reading, or JSON parsing errors and prints them to the terminal.
* **`return [];`**
  Returns an empty array as a safe default if the file is missing or if an error was caught.

---

## 🔹 `writeRecordingsToFile(recordings)`

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

### Explanation & Reference Guide:

* **`function writeRecordingsToFile(recordings) {`**
  Declares the private database write helper. It accepts the array of recordings to persist on disk as a parameter.
* **`const dir = path.dirname(RECORDINGS_FILE);`**
  Extracts the directory portion (`db`) from the absolute target path (`db/recordings.json`).
* **`if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }`**
  Checks if the folder containing the database exists. If it is missing, it is created. `{ recursive: true }` ensures that nested parent directories are created successfully without throwing errors.
* **`fs.writeFileSync(RECORDINGS_FILE, JSON.stringify(recordings, null, 2), 'utf8');`**
  Serializes the JavaScript array into a readable JSON string (using 2-space indentation) and writes it synchronously to the database file, creating or overwriting it.
* **`} catch (err) { console.error('Error writing recordings to file:', err); }`**
  Catches and logs any write errors (such as disk full or write permission issues) to the console to assist developers in debugging.

---

## 🔹 `getAccessTokenResponse(rawIdentity)`

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
```

### Explanation & Reference Guide:

* **`export function getAccessTokenResponse(rawIdentity) {`**
  Declares and exports the token generator function. It accepts the client username (`rawIdentity`) from the API request query.
* **`const identity = rawIdentity || 'mahmoud_browser';`**
  Resolves the caller identity. If no identity is provided, it defaults to the string `'mahmoud_browser'`.
* **`const AccessToken = twilio.jwt.AccessToken;`**
  Extracts the `AccessToken` class from Twilio's JWT utility library.
* **`const VoiceGrant = AccessToken.VoiceGrant;`**
  Extracts the nested `VoiceGrant` subclass helper. Grants dictate the capabilities authorized for the token bearer (e.g. voice calling, chat access).
* **`if (!process.env.API_Key_SID || !process.env.API_Key_Secret || !process.env.TwiML_App_SID) {`**
  Checks if the required environment variables are configured. If any variable is missing, it halts execution immediately.
* **`throw new Error('API Keys or TwiML App SID are not configured in environment variables.');`**
  Throws an error to prevent generating invalid tokens.
* **`const token = new AccessToken(...)`**
  Instantiates the JWT token object. It passes the Twilio Account SID, the API Key SID, and the API Key Secret. This setup allows the browser client to register and make calls securely without exposing the master Account SID and Auth Token to the client code. The final argument binds the token to this specific WebRTC username.
* **`token.identity = identity;`**
  Binds the client username to the token. This registers the client under this identity on Twilio's gateway, making them reachable for incoming calls.
* **`const voiceGrant = new VoiceGrant({ outgoingApplicationSid: process.env.TwiML_App_SID, incomingAllow: true });`**
  Instantiates the voice permissions:
  * `outgoingApplicationSid`: Links outgoing calls initiated by the WebRTC client to our TwiML application SID, which handles the routing webhooks.
  * `incomingAllow: true`: Tells Twilio's routing gateway to keep the WebRTC WebSocket connection open and listen for calls targeting this client's identity.
* **`token.addGrant(voiceGrant);`**
  Attaches the Voice Grant permissions to the token.
* **`return { status: 200, data: { identity, token: token.toJwt() } };`**
  Compiles the response payload. `.toJwt()` signs the token cryptographically using the API secret, producing a base64 JWT string to be sent to the client.

---

## 🔹 `getVoiceWebhookResponse(to, from, host)`

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

### Explanation & Reference Guide:

* **`export function getVoiceWebhookResponse(to, from, host) {`**
  Declares and exports the voice routing controller handler. It processes the destination (`to`), caller (`from`), and host server domain (`host`).
* **`const twiml = new twilio.twiml.VoiceResponse();`**
  Initializes a TwiML generation instance to programmatically construct XML output.
* **`const callbackUrl = \`https://\${host}/recording-callback\`;`**
  Constructs the absolute HTTPS callback endpoint dynamically using the host domain.
* **`if (to === process.env.Twilio_Phone_Number) {`**
  Checks if the call is routed to our Twilio number. If yes, it is an **incoming call** from an external line.
* **`const dial = twiml.dial({ record: 'record-from-answer-dual', recordingStatusCallback: callbackUrl });`**
  Appends a `<Dial>` node to instruct Twilio to bridge the call:
  * `record: 'record-from-answer-dual'`: Enables automatic dual-channel stereo recording.
  * `recordingStatusCallback`: Sets the URL where Twilio will send the recording file details once it is ready.
* **`dial.client('mahmoud_browser');`**
  Appends a `<Client>` node targeting `'mahmoud_browser'`. This instructs Twilio to route the call to the registered WebRTC browser client.
* **`else if (to) {`**
  Executes if the call destination is another phone number, meaning this is an **outgoing call** from the browser.
* **`const dial = twiml.dial({ callerId: process.env.Twilio_Phone_Number, record: 'record-from-answer-dual', recordingStatusCallback: callbackUrl });`**
  Appends a `<Dial>` node configured for outgoing calls. The `callerId` is set to our Twilio number so the recipient sees our business number.
* **`if (to.startsWith('client:')) { dial.client(to.replace('client:', '')); }`**
  Checks if the destination target is another WebRTC client identifier. If true, strips the `'client:'` prefix and dials the target browser user.
* **`else { dial.number(to); }`**
  If false, the destination is treated as a standard phone number and dialed using the `<Number>` tag.
* **`else { twiml.say('Welcome. No destination was specified for this call.'); }`**
  Run if no destination is provided. Uses a Text-To-Speech `<Say>` node to read an error message to the caller.
* **`return { status: 200, type: 'text/xml', content: twiml.toString() };`**
  Compiles and returns the TwiML XML string with the correct content-type header (`text/xml`).

---

## 🔹 `getTestCallResponse(host)`

```javascript
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
```

### Explanation & Reference Guide:

* **`export async function getTestCallResponse(host) {`**
  Declares and exports the asynchronous function.
* **`const callbackUrl = \`https://\${host}/recording-callback\`;`**
  Constructs the absolute callback URL for recording metadata.
* **`const call = await twilioClient.calls.create({ url, to, from, record, recordingStatusCallback });`**
  Uses the pre-authenticated Twilio REST client to initiate a new call.
  * `url`: Points to our server's `/voice` webhook. When the user answers, Twilio requests this URL to retrieve TwiML instructions.
  * `to`: The target verified mobile number.
  * `from`: Your purchased Twilio phone number.
  * `record: true`: Instructs Twilio to record the call.
  * `recordingStatusCallback`: Sets the URL to receive recording metadata.
* **`console.log(\`[Service] Triggered test call: \${call.sid} (recording active)\`);`**
  Logs the unique Call SID (`CA...`) returned by Twilio to confirm the call was successfully queued.
* **`return { status: 200, message: 'call has been sent' };`**
  Returns the success response payload.

---

## 🔹 `handleRecordingCallback(body)`

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
```

### Explanation & Reference Guide:

* **`export function handleRecordingCallback(body) {`**
  Declares and exports the webhook handler. It accepts the parsed POST request body containing the recording parameters.
* **`const { CallSid, RecordingUrl, RecordingDuration, RecordingSid } = body;`**
  Destructures the parameters sent by Twilio: Call SID, Recording URL, Duration (seconds), and Recording SID.
* **`const recordings = readRecordingsFromFile();`**
  Reads the existing database records from `db/recordings.json`.
* **`const recordingInfo = { ... };`**
  Compiles the recording descriptor object. It appends `.mp3` to the Twilio `RecordingUrl` to enable direct audio playback in modern browsers and logs the current date and time in ISO format.
* **`recordings.unshift(recordingInfo);`**
  Adds the new record to the beginning (index `0`) of the array so new calls show up at the top of the list in the UI.
* **`if (recordings.length > 100) { recordings.pop(); }`**
  Checks if the list size exceeds 100. If so, it removes the oldest record at the end of the array to save disk space.
* **`writeRecordingsToFile(recordings);`**
  Saves the updated recordings array back to `db/recordings.json`.
* **`console.log(...);`**
  Logs details about the saved recording to the console for developers.
* **`return { status: 200, message: 'Recording metadata saved successfully.' };`**
  Returns a success response back to Twilio to acknowledge receipt of the webhook.

---

## 🔹 `getRecordingsList()`

```javascript
export function getRecordingsList() {
  return {
    status: 200,
    data: readRecordingsFromFile()
  };
}
```

### Explanation & Reference Guide:

* **`export function getRecordingsList() {`**
  Declares and exports the database getter function.
* **`return { status: 200, data: readRecordingsFromFile() };`**
  Reads the database file using the read helper and returns the records array inside a success payload.

---

## 👤 Project Maintainer & Lead Developer

* **Name:** Mahmoud Ebead
* **Role:** VoIP Software Engineer & Web Developer
* **Professional Profile:** Connect and follow my work on [LinkedIn](https://www.linkedin.com/in/mahmoud-ebead/)
