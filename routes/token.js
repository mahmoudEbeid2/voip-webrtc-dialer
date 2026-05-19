import express from 'express';
import { getAccessToken } from '../controllers/tokenController.js';

const router = express.Router();

// Define Token endpoint route
router.get('/', getAccessToken);

export default router;
