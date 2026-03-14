import express from 'express';
import { z } from 'zod';
import { resolveTokenOwner } from '../middleware/auth.js';
import { endpoints } from '../services/paccApi.js';
import {
  deleteUserToken,
  getUserTokenRecord,
  getDecryptedUserToken,
  markUserTokenValidated,
  saveUserToken,
} from '../services/tokenStore.js';

const router = express.Router();

const saveTokenSchema = z.object({
  token: z.string().min(20),
  note: z.string().max(255).optional().default(''),
});

router.get('/status', (req, res) => {
  const owner = resolveTokenOwner(req);
  const record = getUserTokenRecord(owner);
  return res.json({
    hasToken: !!record,
    tokenNote: record?.token_note || '',
    lastValidatedAt: record?.last_validated_at || null,
    updatedAt: record?.updated_at || null,
  });
});

router.post('/save', async (req, res) => {
  try {
    const input = saveTokenSchema.parse(req.body);
    const validation = await endpoints.validateToken(input.token);
    const owner = resolveTokenOwner(req);

    saveUserToken({ owner, token: input.token, note: input.note });
    markUserTokenValidated(owner);

    return res.json({
      message: 'Token saved and validated successfully.',
      validationData: validation.data,
    });
  } catch (error) {
    if (error?.issues) {
      return res.status(400).json({ message: 'Invalid token input.', issues: error.issues });
    }
    return res.status(error.status || 500).json({
      message: 'Token validation failed.',
      upstream: error.data || null,
    });
  }
});

router.delete('/', (req, res) => {
  const owner = resolveTokenOwner(req);
  deleteUserToken(owner);
  res.json({ message: 'Stored token deleted.' });
});

router.get('/peek', (req, res) => {
  const owner = resolveTokenOwner(req);
  const tokenData = getDecryptedUserToken(owner);
  if (!tokenData) {
    return res.status(404).json({ message: 'No token saved.' });
  }
  return res.json({
    note: tokenData.token_note || '',
    preview: `${tokenData.token.slice(0, 10)}...${tokenData.token.slice(-6)}`,
  });
});

export default router;
