import { DOM, log, updateStatusBadge } from './ui.js';
import { CONFIG, voiceState } from './state.js';
import { bindCallSessionEvents } from './call.js';

/**
 * Fetches the Access Token and initializes the Twilio Device.
 */
export async function initializeTwilioDevice() {
  log('Requesting Voice Access Token from server...');
  updateStatusBadge('connecting', 'Fetching token...');
  
  try {
    const response = await fetch(`${CONFIG.tokenUrl}?identity=${CONFIG.clientIdentity}`);
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    
    const data = await response.json();
    log(`Token acquired successfully. Identity: ${data.identity}`, 'success');

    log('Configuring Twilio.Device...');
    voiceState.device = new Twilio.Device(data.token, {
      codecPreferences: ['opus', 'pcmu'],
      enableIceRestart: true
    });

    setupDeviceEventListeners();

    log('Registering Device with Twilio network...');
    await voiceState.device.register();

  } catch (err) {
    log(`Device initialization failed: ${err.message}`, 'error');
    updateStatusBadge('error', 'Failed Init');
  }
}

/**
 * Registers listeners for Twilio Device connection and signaling events.
 */
function setupDeviceEventListeners() {
  const { device } = voiceState;
  if (!device) return;

  // Device successfully registered with Twilio servers
  device.on('registered', () => {
    log('Twilio Device is registered and ready to place/receive calls.', 'success');
    updateStatusBadge('ready', 'Ready');
    DOM.btnCall.disabled = false;
  });

  // Device lost registration
  device.on('unregistered', () => {
    log('Twilio Device unregistered.', 'warning');
    updateStatusBadge('error', 'Unregistered');
  });

  // Signaling/Connection errors
  device.on('error', (error) => {
    log(`Twilio Signaling error: ${error.message} (Code: ${error.code})`, 'error');
    updateStatusBadge('error', `Error: ${error.code}`);
  });

  // Catching incoming WebRTC call invites
  device.on('incoming', (call) => {
    log(`Incoming WebRTC call invitation from: ${call.parameters.From}`, 'warning');
    voiceState.activeCall = call;
    
    // Display the incoming call UI modal
    DOM.incomingCallerId.textContent = call.parameters.From;
    DOM.incomingCallOverlay.classList.add('active');
    
    bindCallSessionEvents(call);
  });
}
