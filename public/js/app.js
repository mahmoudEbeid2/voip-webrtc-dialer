import { DOM, log, clearLogs } from './ui.js';
import { initializeTwilioDevice } from './device.js';
import {
  placeOutgoingCall,
  disconnectCall,
  toggleMute,
  acceptIncomingCall,
  rejectIncomingCall,
  pressKey
} from './call.js';
import { pollRecordings } from './recording.js';

// Bind UI actions to control buttons
DOM.btnClearInput.addEventListener('click', () => {
  DOM.phoneNumberInput.value = '';
  DOM.phoneNumberInput.focus();
});

DOM.btnCall.addEventListener('click', placeOutgoingCall);
DOM.btnHangup.addEventListener('click', disconnectCall);
DOM.btnMute.addEventListener('click', toggleMute);

DOM.btnAcceptCall.addEventListener('click', acceptIncomingCall);
DOM.btnDeclineCall.addEventListener('click', rejectIncomingCall);

// Expose handlers to window object for inline HTML click handlers
window.pressKey = pressKey;
window.clearLogs = clearLogs;

// Bootstrap application on DOM ready
window.addEventListener('DOMContentLoaded', async () => {
  log('Application bootstrap loaded.');
  
  // Request browser audio permission early for WebRTC compatibility
  try {
    log('Requesting browser audio permission...');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Stop tracks immediately as we just wanted to verify permission grant
    stream.getTracks().forEach(track => track.stop());
    log('Microphone permission granted.', 'success');
  } catch (err) {
    log(`Microphone permission denied: ${err.message}. VoIP will be read-only.`, 'error');
  }

  // Initialize the Twilio VoIP Device
  await initializeTwilioDevice();

  // Initial pull of recordings
  await pollRecordings();
});
