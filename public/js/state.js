/**
 * Shared runtime state and configuration for the Twilio VoIP client.
 */

export const CONFIG = {
  clientIdentity: 'mahmoud_browser',
  tokenUrl: '/token'
};

export const voiceState = {
  device: null,
  activeCall: null
};
