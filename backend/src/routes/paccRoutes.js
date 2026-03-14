import express from 'express';
import { z } from 'zod';
import { resolveTokenOwner } from '../middleware/auth.js';
import { endpoints } from '../services/paccApi.js';
import { getDecryptedUserToken } from '../services/tokenStore.js';

const router = express.Router();

function getTokenOrThrow(req, res) {
  const owner = resolveTokenOwner(req);
  const tokenData = getDecryptedUserToken(owner);
  if (!tokenData?.token) {
    res.status(400).json({
      message: 'No SVP bearer token saved for this session.',
      needsTokenInput: true,
    });
    return null;
  }
  return tokenData.token;
}

async function handle(res, fn) {
  try {
    const response = await fn();
    return res.json(response.data);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return res.status(error.status).json({
        message: 'SVP token is invalid or expired. Please save a new bearer token.',
        tokenExpired: true,
        needsTokenInput: true,
        upstream: error.data || null,
      });
    }

    return res.status(error.status || 500).json({
      message: 'Upstream request failed.',
      upstream: error.data || null,
    });
  }
}

router.get('/validate-token', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.validateToken(token));
});

router.get('/permissions', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.permissions(token));
});

router.get('/occupations', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.occupations(token, req.query));
});

router.get('/certificate-price', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.certificatePrice(token));
});

router.get('/verification-requests', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.verificationRequests(token));
});

router.get('/exam-constraints', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.examConstraints(token));
});

router.get('/feature-flags', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.featureFlags(token));
});

router.get('/notifications', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  const params = {
    page: req.query.page,
    per_page: req.query.per_page,
    user_id: req.query.user_id,
  };
  return handle(res, () => endpoints.notifications(token, params));
});

router.get('/payments/validate-pending', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.validatePendingPayments(token));
});

router.get('/exam-sessions/available-dates', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.availableDates(token, req.query));
});

router.get('/exam-sessions', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.examSessions(token, req.query));
});

router.get('/exam-sessions/:id', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.examSessionDetails(token, req.params.id));
});

router.post('/temporary-seats', express.json(), async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.temporarySeats(token, req.body));
});

router.get('/balance/:userId', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.userBalance(token, req.params.userId, req.query));
});

router.get('/reservations', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.reservations(token));
});

router.get('/reservations/validate', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.validateReservation(token, req.query));
});

router.get('/reservations/:id', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.reservationDetails(token, req.params.id));
});

const reservationSchema = z.object({
  exam_session_id: z.number(),
  occupation_id: z.number(),
  language_code: z.string(),
  methodology: z.string(),
  site_id: z.union([z.number(), z.null()]).optional().default(null),
  site_city: z.union([z.string(), z.null()]).optional().default(null),
  hold_id: z.union([z.number(), z.null()]).optional().default(null),
});

router.post('/reservations', express.json(), async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;

  try {
    const payload = reservationSchema.parse(req.body);
    return handle(res, () => endpoints.createReservation(token, payload));
  } catch (error) {
    return res.status(400).json({ message: 'Invalid reservation payload.', issues: error.issues || null });
  }
});

const reservationCreditSchema = z.object({
  methodology_type: z.string(),
  reservation_id: z.number(),
  occupation_id: z.number(),
});

router.post('/reservation-credits/use', express.json(), async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;

  try {
    const payload = reservationCreditSchema.parse(req.body);
    return handle(res, () => endpoints.useReservationCredit(token, payload));
  } catch (error) {
    return res.status(400).json({ message: 'Invalid reservation credit payload.', issues: error.issues || null });
  }
});

router.get('/tickets/:id/pdf', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;

  try {
    const response = await endpoints.ticketPdf(token, req.params.id);
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="ticket-${req.params.id}.pdf"`);
    return res.send(Buffer.from(response.data));
  } catch (error) {
    return res.status(error.status || 500).json({
      message: 'Failed to fetch ticket PDF.',
      upstream: error.data || null,
    });
  }
});

router.delete('/logout-official', async (req, res) => {
  const token = getTokenOrThrow(req, res);
  if (!token) return;
  return handle(res, () => endpoints.logoutOfficial(token));
});

export default router;
