import axios from 'axios';
import { env } from '../config/env.js';

function createClient(token) {
  return axios.create({
    baseURL: env.SVP_API_BASE_URL,
    timeout: 30000,
    headers: {
      Accept: 'application/json, text/plain, */*',
      Authorization: `Bearer ${token}`,
    },
  });
}

function withLocale(params = {}) {
  return { ...params, locale: env.SVP_LOCALE };
}

function apiError(error) {
  if (error.response) {
    return {
      status: error.response.status,
      data: error.response.data,
    };
  }
  return {
    status: 500,
    data: { message: error.message || 'Unexpected upstream error.' },
  };
}

export async function callPacc(token, method, path, { params, data, responseType } = {}) {
  try {
    const client = createClient(token);
    const response = await client.request({
      method,
      url: path,
      params: withLocale(params),
      data,
      responseType,
    });
    return response;
  } catch (error) {
    throw apiError(error);
  }
}

export const endpoints = {
  validateToken: (token) => callPacc(token, 'GET', '/individual_labor_space/permissions'),
  permissions: (token) => callPacc(token, 'GET', '/individual_labor_space/permissions'),
  occupations: (token, params) => callPacc(token, 'GET', '/individual_labor_space/occupations', { params }),
  certificatePrice: (token) => callPacc(token, 'GET', '/individual_labor_space/certificate_price'),
  verificationRequests: (token) => callPacc(token, 'GET', '/individual_labor_space/verification_requests'),
  examConstraints: (token) => callPacc(token, 'GET', '/individual_labor_space/exam_constraints'),
  featureFlags: (token) => callPacc(token, 'GET', '/flipper/feature_flags'),
  notifications: (token, params) => callPacc(token, 'GET', '/individual_labor_space/notifications', { params }),
  validatePendingPayments: (token) => callPacc(token, 'GET', '/individual_labor_space/payments/validate_pending'),
  availableDates: (token, params) => callPacc(token, 'GET', '/individual_labor_space/exam_sessions/available_dates', { params }),
  examSessions: (token, params) => callPacc(token, 'GET', '/individual_labor_space/exam_sessions', { params }),
  examSessionDetails: (token, id) => callPacc(token, 'GET', `/individual_labor_space/exam_sessions/${id}`),
  temporarySeats: (token, payload) => callPacc(token, 'POST', '/individual_labor_space/temporary_seats', { data: payload }),
  userBalance: (token, userId, params) => callPacc(token, 'GET', `/users/${userId}/balance`, { params }),
  reservations: (token) => callPacc(token, 'GET', '/individual_labor_space/exam_reservations'),
  reservationDetails: (token, id) => callPacc(token, 'GET', `/individual_labor_space/exam_reservations/${id}`),
  validateReservation: (token, params) => callPacc(token, 'GET', '/individual_labor_space/exam_reservations/validate', { params }),
  createReservation: (token, payload) => callPacc(token, 'POST', '/individual_labor_space/exam_reservations', { data: payload }),
  useReservationCredit: (token, payload) => callPacc(token, 'POST', '/individual_labor_space/reservation_credits/use', { data: payload }),
  ticketPdf: (token, id) => callPacc(token, 'GET', `/individual_labor_space/tickets/${id}/show_pdf`, { responseType: 'arraybuffer' }),
  logoutOfficial: (token) => callPacc(token, 'DELETE', '/logout'),
};
