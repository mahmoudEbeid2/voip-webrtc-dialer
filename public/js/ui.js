// DOM Elements Caching
export const DOM = {
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  phoneNumberInput: document.getElementById('phoneNumber'),
  btnClearInput: document.getElementById('btnClearInput'),
  btnCall: document.getElementById('btnCall'),
  btnHangup: document.getElementById('btnHangup'),
  btnMute: document.getElementById('btnMute'),
  logsContainer: document.getElementById('logs'),
  incomingCallOverlay: document.getElementById('incomingCallOverlay'),
  incomingCallerId: document.getElementById('incomingCallerId'),
  btnAcceptCall: document.getElementById('btnAcceptCall'),
  btnDeclineCall: document.getElementById('btnDeclineCall')
};

/**
 * Appends a formatted log message with a timestamp to the console log viewer.
 * @param {string} message - The text content of the log.
 * @param {string} [type='info'] - Log status level ('info', 'success', 'warning', 'error').
 */
export function log(message, type = 'info') {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  
  const logItem = document.createElement('div');
  logItem.className = 'log-item';
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'log-time';
  timeSpan.textContent = `[${timeStr}]`;
  
  const msgSpan = document.createElement('span');
  msgSpan.className = `log-${type}`;
  msgSpan.textContent = message;
  
  logItem.appendChild(timeSpan);
  logItem.appendChild(msgSpan);
  
  DOM.logsContainer.appendChild(logItem);
  DOM.logsContainer.scrollTop = DOM.logsContainer.scrollHeight;
  console.log(`[${type.toUpperCase()}] ${message}`);
}

/**
 * Clears the on-screen console panel.
 */
export function clearLogs() {
  DOM.logsContainer.innerHTML = '';
  log('Logs cleared.');
}

/**
 * Updates the connection status badge visual styling and text.
 * @param {string} state - Connection state ('ready', 'connecting', 'active', 'error').
 * @param {string} message - Descriptive text message.
 */
export function updateStatusBadge(state, message) {
  DOM.statusText.textContent = message;
  DOM.statusDot.className = 'status-dot'; // Reset class names
  
  switch(state) {
    case 'ready':
      DOM.statusDot.classList.add('ready');
      break;
    case 'connecting':
      DOM.statusDot.classList.add('connecting');
      break;
    case 'active':
      DOM.statusDot.classList.add('active');
      break;
    case 'error':
    default:
      DOM.statusDot.classList.add('error');
      break;
  }
}
