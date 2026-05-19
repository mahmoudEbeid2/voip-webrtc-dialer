import { getAccessTokenResponse } from '../services/twilioService.js';

/**
 * Gets a token for the request identity
 * GET /token
 */
export function getAccessToken(req, res) {
  try {
    const result = getAccessTokenResponse(req.query.identity);
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error(`[Token Controller Error] ${err.message}`);
    res.status(500).json({ error: err.message });
  }
}
