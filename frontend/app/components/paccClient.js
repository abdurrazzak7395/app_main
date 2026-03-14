import { API_BASE, apiFetch } from './api';

function toQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  return search.toString();
}

export const authApi = {
  me: () => apiFetch('/api/auth/me'),
  logout: () => apiFetch('/api/auth/logout', { method: 'POST' }),
};

export const tokenApi = {
  status: () => apiFetch('/api/token/status'),
  save: ({ token, note }) => apiFetch('/api/token/save', {
    method: 'POST',
    body: JSON.stringify({ token, note }),
  }),
  remove: () => apiFetch('/api/token', { method: 'DELETE' }),
  validate: () => apiFetch('/api/pacc/validate-token'),
};

export const paccApi = {
  permissions: () => apiFetch('/api/pacc/permissions'),
  occupations: (params) => apiFetch(`/api/pacc/occupations?${toQuery(params)}`),
  availableDates: (params) => apiFetch(`/api/pacc/exam-sessions/available-dates?${toQuery(params)}`),
  examSessions: (params) => apiFetch(`/api/pacc/exam-sessions?${toQuery(params)}`),
  examSessionDetails: (id) => apiFetch(`/api/pacc/exam-sessions/${id}`),
  reservations: () => apiFetch('/api/pacc/reservations'),
  reservationDetails: (id) => apiFetch(`/api/pacc/reservations/${id}`),
  validateReservation: (params) => apiFetch(`/api/pacc/reservations/validate?${toQuery(params)}`),
  balance: (userId, params) => apiFetch(`/api/pacc/balance/${userId}?${toQuery(params)}`),
  temporarySeats: (payload) => apiFetch('/api/pacc/temporary-seats', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  createReservation: (payload) => apiFetch('/api/pacc/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  ticketPdfUrl: (id) => `${API_BASE}/api/pacc/tickets/${id}/pdf`,
};

export function extractList(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];

  const keys = ['data', 'items', 'results', 'rows', 'exam_sessions', 'exam_reservations', 'dates', 'occupations'];
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key];
  }
  return [];
}
