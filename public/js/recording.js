import { DOM, log } from './ui.js';

const knownRecordingSids = new Set();
const btnRefreshRecordings = document.getElementById('btnRefreshRecordings');
const recordingsListContainer = document.getElementById('recordingsList');

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
      <a href="${rec.url}" target="_blank" class="rec-play-btn">
        <i class="fa-solid fa-circle-play"></i> Listen/Download (MP3)
      </a>
    `;
    recordingsListContainer.appendChild(card);
  });
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
        link.href = rec.url;
        link.target = '_blank';
        link.style.color = '#22c55e';
        link.style.textDecoration = 'underline';
        link.style.fontWeight = 'bold';
        link.style.marginLeft = '6px';
        link.innerHTML = '<i class="fa-solid fa-file-audio"></i> Listen/Download Recording (MP3)';

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

// Start polling for new recordings every 4 seconds
setInterval(pollRecordings, 4000);
