import { DOM, log, updateStatusBadge } from './ui.js';
import { voiceState } from './state.js';
import { initializeTwilioDevice } from './device.js';

/**
 * Binds signaling listeners to the active call session.
 * @param {Object} call - The active Twilio Call session object.
 */
export function bindCallSessionEvents(call) {
  // Call accepted / voice stream opened
  call.on('accept', () => {
    log('Call answered. WebRTC connection established.', 'success');
    updateStatusBadge('active', 'On Call');
    toggleCallControlsUI(true);
  });

  // Call disconnected / hung up
  call.on('disconnect', () => {
    log('Call has been disconnected.', 'info');
    updateStatusBadge('ready', 'Ready');
    voiceState.activeCall = null;
    
    toggleCallControlsUI(false);
    DOM.incomingCallOverlay.classList.remove('active');
  });

  // Incoming call declined/rejected
  call.on('reject', () => {
    log('Call invitation rejected.', 'warning');
    updateStatusBadge('ready', 'Ready');
    voiceState.activeCall = null;
    DOM.incomingCallOverlay.classList.remove('active');
  });

  // Error during active call
  call.on('error', (err) => {
    log(`Call session error: ${err.message}`, 'error');
  });
}

/**
 * Updates UI action controls based on connection state.
 * @param {boolean} isOnCall - True if call is active, false if disconnected.
 */
export function toggleCallControlsUI(isOnCall) {
  if (isOnCall) {
    DOM.btnCall.style.display = 'none';
    DOM.btnHangup.style.display = 'flex';
    DOM.btnMute.style.display = 'flex';
    DOM.btnMute.disabled = false;
  } else {
    DOM.btnCall.style.display = 'flex';
    DOM.btnHangup.style.display = 'none';
    DOM.btnMute.style.display = 'none';
    DOM.btnMute.disabled = true;
    DOM.btnMute.className = 'control-btn btn-mute'; // Reset muted design
  }
}

/**
 * Places an outgoing audio call from the browser dialer.
 */
export async function placeOutgoingCall() {
  const destination = DOM.phoneNumberInput.value.trim();
  if (!destination) {
    log('Please enter a phone number or client identity.', 'warning');
    return;
  }

  if (!voiceState.device) {
    log('Device not initialized. Initializing dynamic setup...', 'warning');
    await initializeTwilioDevice();
    return;
  }

  log(`Initiating call to ${destination}...`);
  updateStatusBadge('connecting', 'Calling...');
  
  try {
    const call = await voiceState.device.connect({
      params: { To: destination }
    });
    
    voiceState.activeCall = call;
    bindCallSessionEvents(call);
  } catch (err) {
    log(`Call connection failed: ${err.message}`, 'error');
    updateStatusBadge('ready', 'Ready');
  }
}

/**
 * Terminates the active call session.
 */
export function disconnectCall() {
  if (voiceState.activeCall) {
    log('Disconnecting active call session...');
    voiceState.activeCall.disconnect();
  }
}

/**
 * Mutes or unmutes the browser microphone input.
 */
export function toggleMute() {
  const { activeCall } = voiceState;
  if (activeCall) {
    const isMuted = activeCall.isMuted();
    activeCall.mute(!isMuted);
    DOM.btnMute.classList.toggle('muted');
    
    if (!isMuted) {
      log('Microphone muted. Caller cannot hear you.', 'warning');
    } else {
      log('Microphone unmuted.', 'info');
    }
  }
}

/**
 * Answers the incoming VoIP call invite.
 */
export function acceptIncomingCall() {
  if (voiceState.activeCall) {
    log('Answering incoming call invite...');
    voiceState.activeCall.accept();
    DOM.incomingCallOverlay.classList.remove('active');
  }
}

/**
 * Rejects the incoming VoIP call invite.
 */
export function rejectIncomingCall() {
  if (voiceState.activeCall) {
    log('Rejecting incoming call invite...');
    voiceState.activeCall.reject();
    DOM.incomingCallOverlay.classList.remove('active');
  }
}

/**
 * Appends characters to the dialer screen, sending DTMF tones if on call.
 * @param {string} key - Digit/character (*, #, 0-9)
 */
export function pressKey(key) {
  DOM.phoneNumberInput.value += key;
  
  const { activeCall } = voiceState;
  if (activeCall && activeCall.status() === 'open') {
    activeCall.sendDigits(key);
    log(`DTMF tone sent: ${key}`);
  }
}
