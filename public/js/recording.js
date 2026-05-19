import { DOM, log } from './ui.js';

const knownRecordingSids = new Set();
const btnRefreshRecordings = document.getElementById('btnRefreshRecordings');
const recordingsListContainer = document.getElementById('recordingsList');

// Inline Audio Player Elements
const audioPlayerContainer = document.getElementById('audioPlayerContainer');
const audioElement = document.getElementById('audioElement');
const playerTrackName = document.getElementById('playerTrackName');
const btnClosePlayer = document.getElementById('btnClosePlayer');

let activeRecordingSid = null;

/**
 * Updates play buttons in the UI to reflect active playing status.
 */
function updatePlayButtonsUI() {
  document.querySelectorAll('.rec-play-btn').forEach(btn => {
    if (btn.dataset.sid === activeRecordingSid) {
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Playing...';
      btn.style.background = '#22c55e';
    } else {
      btn.innerHTML = '<i class="fa-solid fa-play"></i> Play Inline';
      btn.style.background = '';
    }
  });
}

/**
 * Triggers inline audio playback using the HTML5 audio element.
 * @param {string} url - Twilio recording MP3 URL
 * @param {string} sid - Recording SID
 */
function playAudioInline(url, sid) {
  if (!audioPlayerContainer || !audioElement || !playerTrackName) return;

  activeRecordingSid = sid;

  // Show the player container
  audioPlayerContainer.style.display = 'flex';

  // Set active track description
  playerTrackName.innerHTML = `<i class="fa-solid fa-compact-disc fa-spin"></i> Playing: ${sid.substring(0, 12)}...`;

  // Load and play the media
  audioElement.src = url;
  audioElement.load();
  audioElement.play().catch(err => {
    console.error('Audio autoplay blocked or failed:', err);
    playerTrackName.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Autoplay blocked. Click Play.`;
  });

  updatePlayButtonsUI();
}

/**
 * Renders the persistent recordings history list in the left sidebar panel.
 * @param {Array} recordings - List of recording objects from server
 */
function renderRecordingsList(recordings) {
  if (!recordingsListContainer) return;

  if (recordings.length === 0) {
    recordingsListContainer.innerHTML = `
      <div class="no-recordings">
        <i class="fa-solid fa-folder-open" style="font-size: 1.5rem; opacity: 0.5;"></i>
        No recordings found
      </div>
    `;
    return;
  }

  recordingsListContainer.innerHTML = '';
  recordings.forEach(rec => {
    const dateStr = new Date(rec.timestamp).toLocaleString();
    const card = document.createElement('div');
    card.className = 'recording-card';
    card.innerHTML = `
      <div class="rec-meta">
        <span><i class="fa-regular fa-clock"></i> ${dateStr}</span>
        <span><i class="fa-regular fa-hourglass-half"></i> ${rec.duration}s</span>
      </div>
      <div class="rec-title" title="Call SID: ${rec.callSid}">
        Call SID: ${rec.callSid.substring(0, 14)}...
      </div>
      <div class="recording-actions">
        <button class="rec-play-btn" data-url="${rec.url}" data-sid="${rec.recordingSid}">
          <i class="fa-solid fa-play"></i> Play Inline
        </button>
        <a href="${rec.url}" target="_blank" class="rec-download-btn" title="Open/Download MP3">
          <i class="fa-solid fa-download"></i>
        </a>
      </div>
    `;
    recordingsListContainer.appendChild(card);
  });

  // Preserve the active play status on list update
  updatePlayButtonsUI();
}

/**
 * Periodically polls the server for recorded calls history.
 */
export async function pollRecordings() {
  try {
    const response = await fetch('/recordings');
    if (!response.ok) return;
    const recordings = await response.json();

    // Render the persistent sidebar list
    renderRecordingsList(recordings);

    // Scan for and alert on newly ready call recording sessions
    recordings.forEach(rec => {
      if (!knownRecordingSids.has(rec.recordingSid)) {
        // Mark as known
        knownRecordingSids.add(rec.recordingSid);

        // Alert user on active log screen
        log(`Recording ready for Call ${rec.callSid.substring(0, 8)}... (${rec.duration}s)`, 'success');

        // Create a custom log item containing a clickable HTML anchor link
        const logItem = document.createElement('div');
        logItem.className = 'log-item';

        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-time';
        timeSpan.textContent = `[${timeStr}]`;

        const link = document.createElement('a');
        link.href = 'javascript:void(0)';
        link.className = 'log-play-link';
        link.dataset.url = rec.url;
        link.dataset.sid = rec.recordingSid;
        link.style.color = '#22c55e';
        link.style.textDecoration = 'underline';
        link.style.fontWeight = 'bold';
        link.style.marginLeft = '6px';
        link.innerHTML = '<i class="fa-solid fa-play"></i> Play Recording Inline (MP3)';

        logItem.appendChild(timeSpan);
        logItem.appendChild(link);

        DOM.logsContainer.appendChild(logItem);
        DOM.logsContainer.scrollTop = DOM.logsContainer.scrollHeight;
      }
    });
  } catch (err) {
    console.error('Failed to poll call recordings:', err);
  }
}

// Bind Refresh Recordings button action
if (btnRefreshRecordings) {
  btnRefreshRecordings.addEventListener('click', async () => {
    log('Refreshing recordings list...', 'info');
    await pollRecordings();
  });
}

// Audio Element event bindings
if (audioElement) {
  audioElement.addEventListener('ended', () => {
    playerTrackName.innerHTML = `<i class="fa-solid fa-circle-check"></i> Playback finished`;
    activeRecordingSid = null;
    updatePlayButtonsUI();
  });
}

if (btnClosePlayer) {
  btnClosePlayer.addEventListener('click', () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    if (audioPlayerContainer) {
      audioPlayerContainer.style.display = 'none';
    }
    activeRecordingSid = null;
    updatePlayButtonsUI();
  });
}

// Delegate click handler for the recordings list container
if (recordingsListContainer) {
  recordingsListContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.rec-play-btn');
    if (!btn) return;
    playAudioInline(btn.dataset.url, btn.dataset.sid);
  });
}

// Delegate click handler for the developer console logs container
if (DOM.logsContainer) {
  DOM.logsContainer.addEventListener('click', (e) => {
    const link = e.target.closest('.log-play-link');
    if (!link) return;
    e.preventDefault();
    playAudioInline(link.dataset.url, link.dataset.sid);
  });
}

// Start polling for new recordings every 4 seconds
setInterval(pollRecordings, 4000);
