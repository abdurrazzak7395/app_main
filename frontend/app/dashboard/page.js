'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../components/api';
import { extractList, paccApi, tokenApi } from '../components/paccClient';

const defaultAvailableDatesParams = {
  per_page: '1000',
  category_id: '',
  start_at_date_from: '',
  available_seats: 'greater_than::0',
  status: 'scheduled',
};

const defaultExamSessionsParams = {
  category_id: '',
  city: '',
  exam_date: '',
};

const defaultReservationValidateParams = {
  category_id: '',
  condition: 'booking_availability_condition',
};

const defaultBalanceParams = {
  methodology_type: 'in_person',
  occupation_id: '',
};

const defaultTemporarySeatsPayload = {
  exam_session_id: '',
  methodology: 'in_person',
};

const defaultReservationPayload = {
  exam_session_id: '',
  occupation_id: '',
  language_code: 'PNTBB',
  site_id: '',
  site_city: '',
  hold_id: '',
  methodology: 'in_person',
};

function toDisplay(value) {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function asNullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function asRequiredNumber(value) {
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function tokenMessage(error) {
  if (!(error instanceof ApiError)) return error.message || 'Request failed.';
  if (error.data?.tokenExpired || error.data?.needsTokenInput) {
    return 'Token expired/invalid. Please save a new bearer token.';
  }
  return error.message;
}

function pickId(item) {
  return item?.id || item?.reservation_id || item?.exam_session_id || '';
}

function pickOccupationId(item) {
  return item?.occupation_id || item?.id || '';
}

function pickTitle(item) {
  return item?.name || item?.title || item?.city || item?.exam_name || 'Item';
}

function pickSessionCity(item) {
  return item?.city || item?.test_center?.city || item?.site_city || item?.center_city || item?.test_center_city || '';
}

function pickSessionCenter(item) {
  const siteId = item?.test_center?.site_id || item?.site_id || '';
  const city = pickSessionCity(item);
  return item?.test_center_name || item?.site_name || item?.center_name || item?.venue_name || (siteId ? `${city} (site ${siteId})` : city);
}

function pickSessionDate(item) {
  const v = item?.exam_date || item?.start_date_in_tc_time_zone || item?.start_date_in_browser_time_zone || item?.date || item?.start_at_date || item?.session_date || item?.start_at || '';
  if (!v) return '';
  return String(v).slice(0, 10);
}

function uniqueValues(list) {
  return [...new Set(list.filter(Boolean))];
}

function getTotalPages(data) {
  const pages = Number(
    data?.pagination?.pages
      || data?.meta?.pagination?.pages
      || data?.meta?.pages
      || 1
  );
  return Number.isFinite(pages) && pages > 0 ? pages : 1;
}

function Section({ title, children }) {
  return (
    <section className="card stack">
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const [me] = useState({ email: 'Guest session' });
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState('Ready');

  const [tokenInput, setTokenInput] = useState('');
  const [tokenNote, setTokenNote] = useState('');
  const [tokenStatus, setTokenStatus] = useState(null);
  const [tokenWarning, setTokenWarning] = useState('');

  const [permissions, setPermissions] = useState(null);
  const [occupations, setOccupations] = useState([]);
  const [selectedOccupationId, setSelectedOccupationId] = useState('');
  const [occupationSearch, setOccupationSearch] = useState('');
  const [selectedPrometricCode, setSelectedPrometricCode] = useState('');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    city: '',
    test_center: '',
    available_date: '',
    exam_shift: 'morning',
  });
  const [modalCities, setModalCities] = useState([]);
  const [modalAvailableDateRows, setModalAvailableDateRows] = useState([]);
  const [modalAvailableDates, setModalAvailableDates] = useState([]);
  const [modalSessions, setModalSessions] = useState([]);
  const [modalMessage, setModalMessage] = useState('');

  const [availableDatesParams, setAvailableDatesParams] = useState(defaultAvailableDatesParams);
  const [examSessionsParams, setExamSessionsParams] = useState(defaultExamSessionsParams);
  const [reservationValidateParams, setReservationValidateParams] = useState(defaultReservationValidateParams);
  const [balanceUserId, setBalanceUserId] = useState('');
  const [balanceParams, setBalanceParams] = useState(defaultBalanceParams);

  const [availableDates, setAvailableDates] = useState([]);
  const [examSessions, setExamSessions] = useState([]);
  const [selectedExamSessionId, setSelectedExamSessionId] = useState('');
  const [examSessionDetails, setExamSessionDetails] = useState(null);
  const [reservationValidation, setReservationValidation] = useState(null);
  const [balanceResult, setBalanceResult] = useState(null);

  const [temporarySeatsPayload, setTemporarySeatsPayload] = useState(defaultTemporarySeatsPayload);
  const [temporarySeatResult, setTemporarySeatResult] = useState(null);

  const [reservationPayload, setReservationPayload] = useState(defaultReservationPayload);
  const [reservationCreateResult, setReservationCreateResult] = useState(null);

  const [reservations, setReservations] = useState([]);
  const [selectedReservationId, setSelectedReservationId] = useState('');
  const [reservationDetails, setReservationDetails] = useState(null);
  const [ticketId, setTicketId] = useState('');

  const tokenStateText = useMemo(() => {
    if (!tokenStatus?.hasToken) return 'No token saved';
    if (tokenStatus?.tokenNote) return `Saved token: ${tokenStatus.tokenNote}`;
    return 'Saved token active';
  }, [tokenStatus]);

  const selectedOccupation = useMemo(
    () => occupations.find((row) => String(pickOccupationId(row)) === String(selectedOccupationId)),
    [occupations, selectedOccupationId]
  );

  const filteredOccupations = useMemo(() => {
    const q = occupationSearch.trim().toLowerCase();
    if (!q) return occupations;
    return occupations.filter((row) => {
      const id = String(pickOccupationId(row)).toLowerCase();
      const name = String(row?.name || row?.arabic_name || '').toLowerCase();
      const category = String(row?.category_name_en || row?.category_name_ar || '').toLowerCase();
      return id.includes(q) || name.includes(q) || category.includes(q);
    });
  }, [occupations, occupationSearch]);

  const prometricCodes = useMemo(
    () => selectedOccupation?.category?.prometric_codes || [],
    [selectedOccupation]
  );

  const modalCenters = useMemo(
    () => uniqueValues(modalSessions.map((row) => pickSessionCenter(row))),
    [modalSessions]
  );

  const modalDatesForCity = useMemo(() => {
    const source = modalAvailableDateRows.length ? modalAvailableDateRows : modalSessions;
    const filtered = bookingForm.city
      ? source.filter((row) => pickSessionCity(row) === bookingForm.city)
      : source;
    return uniqueValues(filtered.map((row) => pickSessionDate(row)));
  }, [modalAvailableDateRows, modalSessions, bookingForm.city]);

  const run = async (fn) => {
    setBusy(true);
    setTokenWarning('');
    try {
      const data = await fn();
      setOutput(data);
      return data;
    } catch (error) {
      const message = tokenMessage(error);
      setOutput({ error: message, details: error?.data || null });
      if (error instanceof ApiError && (error.data?.tokenExpired || error.data?.needsTokenInput)) {
        setTokenWarning(message);
      }
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const fetchAllOccupations = async () => {
    const perPage = 100;
    const first = await paccApi.occupations({ per_page: perPage, page: 1 });
    const totalPages = getTotalPages(first);
    const firstRows = extractList(first);

    if (totalPages <= 1) return firstRows;

    const pageCalls = [];
    for (let page = 2; page <= totalPages; page += 1) {
      pageCalls.push(paccApi.occupations({ per_page: perPage, page }));
    }
    const rest = await Promise.all(pageCalls);
    const merged = [...firstRows, ...rest.flatMap((row) => extractList(row))];

    const deduped = new Map();
    merged.forEach((row) => {
      const key = String(pickOccupationId(row) || row?.occupation_key || row?.name || Math.random());
      if (!deduped.has(key)) deduped.set(key, row);
    });
    return Array.from(deduped.values());
  };

  const bootstrap = async () => {
    setBalanceUserId('');

    const status = await tokenApi.status();
    setTokenStatus(status);

    if (status.hasToken) {
      const [permRes, occRes, listRes] = await Promise.allSettled([
        paccApi.permissions(),
        fetchAllOccupations(),
        paccApi.reservations(),
      ]);
      if (permRes.status === 'fulfilled') setPermissions(permRes.value);
      if (occRes.status === 'fulfilled') setOccupations(occRes.value);
      if (listRes.status === 'fulfilled') setReservations(extractList(listRes.value));
    }
  };

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshTokenStatus = async () => {
    const status = await run(() => tokenApi.status());
    setTokenStatus(status);
  };

  const saveToken = async () => {
    if (!tokenInput.trim()) return;
    await run(() => tokenApi.save({ token: tokenInput.trim(), note: tokenNote }));
    setTokenInput('');
    await refreshTokenStatus();
  };

  const validateSavedToken = async () => {
    const data = await run(() => tokenApi.validate());
    setPermissions(data);
  };

  const loadOccupations = async () => {
    try {
      const rows = await run(() => fetchAllOccupations());
      setOccupations(rows);
      setModalMessage(rows.length ? `Loaded ${rows.length} occupations.` : 'No occupations returned from API.');
    } catch (error) {
      setModalMessage(tokenMessage(error));
    }
  };

  const applySelectedOccupation = () => {
    if (!selectedOccupationId) return;
    setBalanceParams((prev) => ({ ...prev, occupation_id: String(selectedOccupationId) }));
    setReservationPayload((prev) => ({ ...prev, occupation_id: String(selectedOccupationId) }));
    const categoryId = selectedOccupation?.category_id ? String(selectedOccupation.category_id) : '';
    if (categoryId) {
      setAvailableDatesParams((prev) => ({ ...prev, category_id: categoryId }));
      setExamSessionsParams((prev) => ({ ...prev, category_id: categoryId }));
      setReservationValidateParams((prev) => ({ ...prev, category_id: categoryId }));
    }
    if (selectedPrometricCode) {
      setReservationPayload((prev) => ({ ...prev, language_code: selectedPrometricCode }));
    }
  };

  const loadModalOptions = async () => {
    if (!selectedOccupation?.category_id) return;
    const categoryId = String(selectedOccupation.category_id);
    const today = new Date().toISOString().slice(0, 10);

    const [datesRes, sessionsRes] = await Promise.allSettled([
      run(() => paccApi.availableDates({
        per_page: 1000,
        category_id: categoryId,
        start_at_date_from: today,
        available_seats: 'greater_than::0',
        status: 'scheduled',
      })),
      run(() => paccApi.examSessions({
        category_id: categoryId,
      })),
    ]);

    if (datesRes.status === 'fulfilled') {
      const rows = extractList(datesRes.value);
      setModalAvailableDateRows(rows);
      const citiesFromDates = uniqueValues(rows.map((row) => pickSessionCity(row)));
      if (citiesFromDates.length) {
        setModalCities(citiesFromDates);
        if (!bookingForm.city || !citiesFromDates.includes(bookingForm.city)) {
          setBookingForm((prev) => ({ ...prev, city: citiesFromDates[0] }));
        }
      }
      const values = uniqueValues(rows.map((row) => pickSessionDate(row)));
      setModalAvailableDates(values);
      if (!bookingForm.available_date && values.length) {
        setBookingForm((prev) => ({ ...prev, available_date: values[0] }));
      }
    }

    if (sessionsRes.status === 'fulfilled') {
      const rows = extractList(sessionsRes.value);
      setExamSessions(rows);
      const cities = uniqueValues(rows.map((row) => pickSessionCity(row)));
      setModalCities(cities);
      if ((!bookingForm.city || !cities.includes(bookingForm.city)) && cities.length) {
        setBookingForm((prev) => ({ ...prev, city: cities[0] }));
      }
    }
  };

  useEffect(() => {
    if (!selectedOccupation) return;
    const firstCode = selectedOccupation?.category?.prometric_codes?.[0]?.code || '';
    setSelectedPrometricCode(firstCode);
    setBookingForm((prev) => ({
      ...prev,
      city: '',
      test_center: '',
      available_date: '',
    }));
    setModalCities([]);
    setModalAvailableDateRows([]);
    setModalAvailableDates([]);
    setModalSessions([]);
    setSelectedExamSessionId('');
  }, [selectedOccupation]);

  useEffect(() => {
    if (!bookingModalOpen || !selectedOccupation?.category_id) return;
    loadModalOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingModalOpen, selectedOccupationId]);

  useEffect(() => {
    if (!bookingModalOpen) return;
    if (!tokenStatus?.hasToken) return;
    if (occupations.length > 0) return;
    loadOccupations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingModalOpen, tokenStatus?.hasToken, occupations.length]);

  useEffect(() => {
    if (!bookingModalOpen || !selectedOccupation?.category_id) return;
    if (!bookingForm.city || !bookingForm.available_date) return;
    findSessionsForModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingForm.city, bookingForm.available_date, bookingForm.test_center]);

  const deleteToken = async () => {
    await run(() => tokenApi.remove());
    setTokenStatus({ hasToken: false, tokenNote: '', lastValidatedAt: null, updatedAt: null });
    setPermissions(null);
    setOccupations([]);
  };

  const loadAvailableDates = async () => {
    const data = await run(() => paccApi.availableDates(availableDatesParams));
    setAvailableDates(extractList(data));
  };

  const loadExamSessions = async () => {
    const data = await run(() => paccApi.examSessions(examSessionsParams));
    const list = extractList(data);
    setExamSessions(list);
  };

  const findSessionsForModal = async () => {
    if (!selectedOccupation?.category_id) {
      setModalMessage('Select occupation first.');
      return;
    }

    const params = {
      category_id: String(selectedOccupation.category_id),
      city: bookingForm.city,
      exam_date: bookingForm.available_date,
    };

    const data = await run(() => paccApi.examSessions(params));
    const list = extractList(data);
    const filteredByCenter = bookingForm.test_center
      ? list.filter((row) => pickSessionCenter(row) === bookingForm.test_center)
      : list;
    setModalSessions(filteredByCenter);
    setExamSessions(filteredByCenter);
    setExamSessionsParams(params);
    const cities = uniqueValues(list.map((row) => pickSessionCity(row)));
    if (cities.length) setModalCities(cities);
    setModalMessage(filteredByCenter.length ? `${filteredByCenter.length} sessions found.` : 'No sessions found for selected filters.');

    if (filteredByCenter[0]) {
      const id = pickId(filteredByCenter[0]);
      if (id) {
        setSelectedExamSessionId(String(id));
        setReservationPayload((prev) => ({ ...prev, exam_session_id: String(id) }));
      }
    }
  };

  const loadExamSessionDetails = async () => {
    if (!selectedExamSessionId) return;
    const data = await run(() => paccApi.examSessionDetails(selectedExamSessionId));
    setExamSessionDetails(data);

    setReservationPayload((prev) => ({ ...prev, exam_session_id: String(selectedExamSessionId) }));
    setTemporarySeatsPayload((prev) => ({ ...prev, exam_session_id: String(selectedExamSessionId) }));
  };

  const validateReservation = async () => {
    const data = await run(() => paccApi.validateReservation(reservationValidateParams));
    setReservationValidation(data);
  };

  const loadBalance = async () => {
    if (!balanceUserId) return;
    const data = await run(() => paccApi.balance(balanceUserId, balanceParams));
    setBalanceResult(data);
  };

  const createTemporarySeat = async () => {
    const examSessionId = asRequiredNumber(temporarySeatsPayload.exam_session_id);
    if (!examSessionId) {
      setOutput({ error: 'temporary_seats.exam_session_id is required numeric value.' });
      return;
    }
    const payload = {
      exam_session_id: examSessionId,
      methodology: temporarySeatsPayload.methodology,
    };
    const data = await run(() => paccApi.temporarySeats(payload));
    setTemporarySeatResult(data);
  };

  const createReservation = async () => {
    const payload = {
      exam_session_id: asRequiredNumber(reservationPayload.exam_session_id),
      occupation_id: asRequiredNumber(reservationPayload.occupation_id),
      language_code: reservationPayload.language_code,
      site_id: asNullableNumber(reservationPayload.site_id),
      site_city: reservationPayload.site_city || null,
      hold_id: asNullableNumber(reservationPayload.hold_id),
      methodology: reservationPayload.methodology,
    };

    if (!payload.exam_session_id || !payload.occupation_id) {
      setOutput({ error: 'exam_session_id and occupation_id are required numeric values.' });
      return;
    }

    const data = await run(() => paccApi.createReservation(payload));
    setReservationCreateResult(data);

    const reservationId = pickId(data);
    if (reservationId) {
      setSelectedReservationId(String(reservationId));
      setTicketId(String(reservationId));
    }

    const list = await run(() => paccApi.reservations());
    setReservations(extractList(list));
  };

  const createBookingFromModal = async () => {
    if (!selectedOccupationId) {
      setModalMessage('Select occupation first.');
      return;
    }
    if (!selectedExamSessionId) {
      setModalMessage('Please find/select exam session first.');
      return;
    }

    const payload = {
      exam_session_id: asRequiredNumber(selectedExamSessionId),
      occupation_id: asRequiredNumber(selectedOccupationId),
      language_code: selectedPrometricCode || reservationPayload.language_code,
      site_id: asNullableNumber(reservationPayload.site_id),
      site_city: bookingForm.test_center || bookingForm.city || null,
      hold_id: asNullableNumber(reservationPayload.hold_id),
      methodology: reservationPayload.methodology,
    };

    const data = await run(() => paccApi.createReservation(payload));
    setReservationCreateResult(data);
    const reservationId = pickId(data);
    if (reservationId) {
      setSelectedReservationId(String(reservationId));
      setTicketId(String(reservationId));
    }
    const list = await run(() => paccApi.reservations());
    setReservations(extractList(list));
    setModalMessage('Booking created successfully.');
  };

  const refreshReservations = async () => {
    const data = await run(() => paccApi.reservations());
    setReservations(extractList(data));
  };

  const loadReservationDetails = async () => {
    if (!selectedReservationId) return;
    const data = await run(() => paccApi.reservationDetails(selectedReservationId));
    setReservationDetails(data);
    setTicketId(selectedReservationId);
  };

  const openTicketPdf = () => {
    if (!ticketId) return;
    window.open(paccApi.ticketPdfUrl(ticketId), '_blank');
  };

  const credentialReady = Boolean(me?.email);
  const occupationReady = Boolean(selectedOccupationId);
  const cityReady = Boolean(bookingForm.city.trim());
  const centerReady = Boolean(bookingForm.test_center.trim());
  const dateReady = Boolean(bookingForm.available_date);
  const languageReady = Boolean(selectedPrometricCode);
  const sessionReady = Boolean(selectedExamSessionId);

  return (
    <main className="container stack">
      <div className="hero card">
        <div>
          <p className="eyebrow">SVP Session Exam</p>
          <h1 className="title">Postman-mapped booking dashboard</h1>
          <p className="subtitle">Fields below use the same request parameter names as your collection.</p>
        </div>
        <div className="row">
          <span className="badge">{me ? me.email : 'Loading...'}</span>
          <button className="btn" onClick={() => setBookingModalOpen(true)}>Create New Booking</button>
          <button className="btn secondary" onClick={deleteToken} disabled={busy}>Clear Saved Token</button>
        </div>
      </div>

      {tokenWarning ? <div className="notice">{tokenWarning}</div> : null}
      {bookingModalOpen ? (
        <div className="booking-modal-wrap" role="dialog" aria-modal="true">
          <div className="booking-modal">
            <div className="booking-head">
              <h3>Create New Booking</h3>
              <button className="booking-close" onClick={() => setBookingModalOpen(false)}>x</button>
            </div>
            <label className="label">PACC Credential *</label>
            <div className="booking-input-wrap">
              <div className="booking-field readonly">{me?.email || 'Not signed in'}</div>
              {credentialReady ? <span className="ok-dot">✓</span> : null}
            </div>

            <label className="label">Occupation *</label>
            {!tokenStatus?.hasToken ? <div className="small">No saved token in this browser session. Save token first, then click Load Occupations.</div> : null}
            {!!tokenStatus?.hasToken ? <div className="small">Loaded occupations: {occupations.length}</div> : null}
            <div className="booking-input-wrap">
              <select className="booking-field" value={selectedOccupationId} onChange={(e) => setSelectedOccupationId(e.target.value)}>
                <option value="">Select occupation</option>
                {occupations.map((row, idx) => {
                  const occId = pickOccupationId(row);
                  return <option key={`${occId || idx}-${idx}`} value={String(occId)}>{`${row?.name || pickTitle(row)} (${occId})`}</option>;
                })}
              </select>
              {occupationReady ? <span className="ok-dot">✓</span> : null}
            </div>

            <label className="label">City *</label>
            <div className="booking-input-wrap">
              <select className="booking-field" value={bookingForm.city} onChange={(e) => setBookingForm({ ...bookingForm, city: e.target.value })}>
                <option value="">Select city</option>
                {modalCities.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
              {cityReady ? <span className="ok-dot">✓</span> : null}
            </div>

            <label className="label">Test Center *</label>
            <div className="booking-input-wrap">
              <select className="booking-field" value={bookingForm.test_center} onChange={(e) => setBookingForm({ ...bookingForm, test_center: e.target.value })}>
                <option value="">Select test center</option>
                {modalCenters.map((center) => <option key={center} value={center}>{center}</option>)}
              </select>
              {centerReady ? <span className="ok-dot">✓</span> : null}
            </div>

          <label className="label">Available Date *</label>
          <div className="booking-input-wrap">
            <select className="booking-field" value={bookingForm.available_date} onChange={(e) => setBookingForm({ ...bookingForm, available_date: e.target.value })}>
                <option value="">Select available date...</option>
                {(modalDatesForCity.length ? modalDatesForCity : modalAvailableDates).map((dateValue) => <option key={dateValue} value={dateValue}>{dateValue}</option>)}
              </select>
              {dateReady ? <span className="ok-dot">✓</span> : null}
            </div>

            <label className="label">Exam Shift *</label>
            <div className="booking-input-wrap">
              <select className="booking-field" value={bookingForm.exam_shift} onChange={(e) => setBookingForm({ ...bookingForm, exam_shift: e.target.value })}>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </select>
            </div>

            <label className="label">Language Code *</label>
            <div className="booking-input-wrap">
              <select className="booking-field" value={selectedPrometricCode} onChange={(e) => setSelectedPrometricCode(e.target.value)}>
                <option value="">Select language code</option>
                {prometricCodes.map((row, idx) => (
                  <option key={`${row.code || idx}-${idx}`} value={row.code}>
                    {`${row.code} - ${row.english_name || row.language_code || 'Language'}`}
                  </option>
                ))}
              </select>
              {languageReady ? <span className="ok-dot">✓</span> : null}
            </div>

            <label className="label">Exam Session *</label>
            <div className="booking-input-wrap">
              <select className="booking-field" value={selectedExamSessionId} onChange={(e) => setSelectedExamSessionId(e.target.value)}>
                <option value="">Select exam session</option>
                {modalSessions.map((row, idx) => {
                  const id = pickId(row);
                  return <option key={`${id || idx}-${idx}`} value={String(id)}>{`${id || 'n/a'} - ${pickTitle(row)}`}</option>;
                })}
              </select>
              {sessionReady ? <span className="ok-dot">✓</span> : null}
            </div>

            <div className="row">
              <button className="btn secondary" onClick={loadOccupations} disabled={busy}>Load Occupations</button>
              <button className="btn secondary" onClick={applySelectedOccupation} disabled={busy || !selectedOccupationId}>Apply</button>
              <button className="btn secondary" onClick={loadModalOptions} disabled={busy || !selectedOccupationId}>Load Cities & Dates</button>
              <button className="btn secondary" onClick={findSessionsForModal} disabled={busy}>Find Sessions</button>
            </div>
            <button className="btn booking-submit" onClick={createBookingFromModal} disabled={busy}>Create Booking</button>
            {modalMessage ? <div className="small">{modalMessage}</div> : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-2">
        <Section title="1) Token save/validate (per-user encrypted storage)">
          <div className="small">{tokenStateText}</div>
          <label className="label">token_note</label>
          <input className="input" value={tokenNote} onChange={(e) => setTokenNote(e.target.value)} placeholder="optional" />
          <label className="label">token</label>
          <textarea className="textarea" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="Paste bearer token" />
          <div className="row">
            <button className="btn" onClick={saveToken} disabled={busy}>Save + validate</button>
            <button className="btn secondary" onClick={validateSavedToken} disabled={busy}>Validate saved token</button>
            <button className="btn danger" onClick={deleteToken} disabled={busy}>Delete token</button>
          </div>
        </Section>

        <Section title="2) First booking step: occupations">
          <div className="small">Matches your curl step: <code>/individual_labor_space/occupations?locale=en</code></div>
          <div className="row">
            <button className="btn secondary" onClick={loadOccupations} disabled={busy}>occupations</button>
            <button className="btn secondary" onClick={applySelectedOccupation} disabled={busy || !selectedOccupationId}>Use selected occupation_id</button>
          </div>
          <label className="label">Search occupation (id/name/category)</label>
          <input className="input" value={occupationSearch} onChange={(e) => setOccupationSearch(e.target.value)} placeholder="e.g. 959 or Auto Mechanic" />
          <div className="small">Loaded: {occupations.length} | Showing: {filteredOccupations.length}</div>
          <label className="label">occupation_id (from occupations list)</label>
          <select className="select" value={selectedOccupationId} onChange={(e) => setSelectedOccupationId(e.target.value)}>
            <option value="">Select occupation_id</option>
            {filteredOccupations.map((row, idx) => {
              const occId = pickOccupationId(row);
              return <option key={`${occId || idx}-${idx}`} value={String(occId)}>{`${occId || 'n/a'} - ${pickTitle(row)}`}</option>;
            })}
          </select>
          <label className="label">language_code (prometric code)</label>
          <select className="select" value={selectedPrometricCode} onChange={(e) => setSelectedPrometricCode(e.target.value)}>
            <option value="">Select prometric code</option>
            {prometricCodes.map((row, idx) => (
              <option key={`${row.code || idx}-${idx}`} value={row.code}>
                {`${row.code} - ${row.english_name || row.language_code || 'Language'}`}
              </option>
            ))}
          </select>
          {selectedOccupation ? (
            <div className="small">
              Auto-map preview: category_id={selectedOccupation.category_id}, occupation_id={pickOccupationId(selectedOccupation)}, language_code={selectedPrometricCode || '-'}
            </div>
          ) : null}
          <div className="list-box">
            {filteredOccupations.length === 0 ? <div className="list-item">No occupations loaded</div> : filteredOccupations.map((row, idx) => <div key={idx} className="list-item">{JSON.stringify(row)}</div>)}
          </div>
        </Section>

        <Section title="3) permissions + balance">
          <div className="row">
            <button className="btn secondary" onClick={async () => setPermissions(await run(() => paccApi.permissions()))} disabled={busy}>permissions</button>
          </div>
          <label className="label">user_id (path param)</label>
          <input className="input" value={balanceUserId} onChange={(e) => setBalanceUserId(e.target.value)} />
          <label className="label">methodology_type (query)</label>
          <input className="input" value={balanceParams.methodology_type} onChange={(e) => setBalanceParams({ ...balanceParams, methodology_type: e.target.value })} />
          <label className="label">occupation_id (query)</label>
          <input className="input" value={balanceParams.occupation_id} onChange={(e) => setBalanceParams({ ...balanceParams, occupation_id: e.target.value })} />
          <button className="btn secondary" onClick={loadBalance} disabled={busy}>users/:id/balance</button>
          <div className="pre">{toDisplay(balanceResult || permissions || { note: 'Run permissions or balance.' })}</div>
        </Section>

        <Section title="4) available_dates query (exact keys)">
          <label className="label">per_page</label>
          <input className="input" value={availableDatesParams.per_page} onChange={(e) => setAvailableDatesParams({ ...availableDatesParams, per_page: e.target.value })} />
          <label className="label">category_id</label>
          <input className="input" value={availableDatesParams.category_id} onChange={(e) => setAvailableDatesParams({ ...availableDatesParams, category_id: e.target.value })} />
          <label className="label">start_at_date_from</label>
          <input className="input" type="date" value={availableDatesParams.start_at_date_from} onChange={(e) => setAvailableDatesParams({ ...availableDatesParams, start_at_date_from: e.target.value })} />
          <label className="label">available_seats</label>
          <input className="input" value={availableDatesParams.available_seats} onChange={(e) => setAvailableDatesParams({ ...availableDatesParams, available_seats: e.target.value })} />
          <label className="label">status</label>
          <input className="input" value={availableDatesParams.status} onChange={(e) => setAvailableDatesParams({ ...availableDatesParams, status: e.target.value })} />
          <button className="btn secondary" onClick={loadAvailableDates} disabled={busy}>exam_sessions/available_dates</button>
          <div className="list-box">
            {availableDates.length === 0 ? <div className="list-item">No available dates loaded</div> : availableDates.slice(0, 40).map((row, idx) => <div key={idx} className="list-item">{JSON.stringify(row)}</div>)}
          </div>
        </Section>

        <Section title="9) reservation history + details + ticket/pdf">
          <div className="row">
            <button className="btn secondary" onClick={refreshReservations} disabled={busy}>exam_reservations (GET)</button>
          </div>
          <label className="label">reservation_id (path)</label>
          <div className="row">
            <input className="input" style={{ flex: 1 }} value={selectedReservationId} onChange={(e) => setSelectedReservationId(e.target.value)} />
            <button className="btn secondary" onClick={loadReservationDetails} disabled={busy || !selectedReservationId}>exam_reservations/:id</button>
          </div>
          <label className="label">ticket_id (path)</label>
          <div className="row">
            <input className="input" style={{ flex: 1 }} value={ticketId} onChange={(e) => setTicketId(e.target.value)} />
            <button className="btn secondary" onClick={openTicketPdf} disabled={!ticketId}>tickets/:id/show_pdf</button>
          </div>
          <div className="list-box">
            {reservations.length === 0 ? <div className="list-item">No reservations loaded</div> : reservations.slice(0, 100).map((row, idx) => {
              const id = pickId(row);
              return (
                <button key={`${id || idx}-${idx}`} className="list-item list-button" onClick={() => setSelectedReservationId(String(id || ''))}>
                  <span>#{id || 'n/a'}</span>
                  <span>{pickTitle(row)}</span>
                </button>
              );
            })}
          </div>
          <div className="pre">{toDisplay(reservationDetails || { note: 'Reservation details appear here.' })}</div>
        </Section>

        <Section title="10) API output log">
          <div className="pre">{toDisplay(output)}</div>
        </Section>
      </div>
    </main>
  );
}
