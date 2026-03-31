/**
 * =============================================
 *  WardWatch – Real API Service Layer
 * =============================================
 *
 * All API calls use BASE_URL from apiConfig.js.
 * To switch between local and ngrok, only edit apiConfig.js.
 *
 * Endpoints used:
 *   GET  /api/beds           – All beds (dashboard grid)
 *   PATCH /api/beds/:id      – Update bed status
 *   POST  /api/patients      – Admit patient (auto-assigns bed or adds to queue)
 *   GET   /api/patients/:id  – Get patient details (used in side panel)
 *   PATCH /api/patients/:id  – Update/discharge patient
 *   GET   /api/queue         – Waiting patients sorted by priority
 *   POST  /api/queue         – Manually add a patient to queue
 *   GET   /api/forecast      – Capacity analytics (occupancy, expected, %)
 *   GET   /api/wards         – Ward-wise summary (grouped beds)
 *   GET   /api/alerts/check  – Trigger alert check; backend emits "alertCreated" via Socket.io
 */

import axios from 'axios';
import { BASE_URL } from './apiConfig';

// Axios instance – all requests automatically use BASE_URL
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor to log responses and errors
api.interceptors.response.use(
  (response) => {
    console.log(`[API response] ${response.config.method.toUpperCase()} ${response.config.url}:`, response.data);
    return response;
  },
  (error) => {
    console.error(`[API error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────
//  BEDS
// ─────────────────────────────────────────────

/**
 * GET /api/beds
 * Returns all bed documents from MongoDB.
 * Each bed has: _id, bedNumber, ward, status, patientId (populated), lastUpdated
 */
export const fetchBeds = () => api.get('/beds');

/**
 * POST /api/beds
 * Add a new bed manually.
 * Expected body: { bedNumber: number, ward: string, status: "available" }
 */
export const addBed = (bedData) => api.post('/beds', bedData);

/**
 * PATCH /api/beds/:id
 * Updates a bed's status.
 * @param {string} id  – MongoDB _id of the bed
 * @param {object} data – { status: 'available' | 'occupied' | 'cleaning', patientId? }
 *   - When setting to "occupied", patientId is required.
 *   - Bed transitions: available→occupied, available→cleaning, occupied→cleaning, cleaning→available
 * Also emits Socket.io event: "bedUpdated" with the updated bed document.
 */
export const updateBedStatus = (id, data) => api.patch(`/beds/${id}`, data);

// ─────────────────────────────────────────────
//  PATIENTS
// ─────────────────────────────────────────────

/**
 * POST /api/patients
 * Admit a new patient.
 * @param {object} patientData – { name, age, condition, surgeryType, doctor, rehabType }
 * Backend logic:
 *   - If an "available" bed exists → patient is admitted & bed marked "occupied"
 *   - If no bed available → patient added to the queue automatically
 * Emits Socket.io: "bedUpdated" or "queueUpdated"
 */
export const admitPatient = (patientData) => api.post('/patients', patientData);

/**
 * GET /api/patients/:id
 * Fetch full details for a single patient by MongoDB _id.
 * Used when a nurse clicks an occupied bed tile to see patient info.
 */
export const fetchPatientDetails = (id) => api.get(`/patients/${id}`);

/**
 * PATCH /api/patients/:id
 * Update or discharge a patient.
 * @param {string} id   – MongoDB _id of the patient
 * @param {object} data – { status: 'discharged' } to discharge, or { name, age, condition, doctor } to update
 * When discharging:
 *   - Patient status set to "discharged", dischargeDate recorded
 *   - Associated bed status set to "available", bed.patientId cleared
 *   - Emits Socket.io: "bedUpdated"
 */
export const updatePatient = (id, data) => api.patch(`/patients/${id}`, data);

// Convenience alias used by Dashboard
export const dischargePatient = (id) => updatePatient(id, { status: 'discharged' });

// ─────────────────────────────────────────────
//  QUEUE
// ─────────────────────────────────────────────

/**
 * GET /api/queue
 * Returns all patients in the waiting queue, sorted by priority (high → medium → low)
 * then by scheduledTime within same priority.
 * Each entry has: _id, patientId (populated with patient doc), priority, type, scheduledTime
 */
export const fetchQueue = () => api.get('/queue');

/**
 * POST /api/queue
 * Manually add a patient to the queue.
 * @param {object} data – { patientId, priority: 'high'|'medium'|'low', type: 'emergency'|'scheduled', scheduledTime? }
 * Emits Socket.io: "queueUpdated" with the full updated queue
 */
export const addToQueue = (data) => api.post('/queue', data);

// ─────────────────────────────────────────────
//  FORECAST & ANALYTICS
// ─────────────────────────────────────────────

/**
 * GET /api/forecast
 * Returns capacity analytics computed from live MongoDB data:
 *   - totalBeds:          Total bed count
 *   - currentOccupied:    Beds with status "occupied"
 *   - expectedOccupancy:  currentOccupied - dischargesNext4h + incomingPatients
 *   - dischargesNext4h:   Admitted patients with dischargeDate within next 4 hours
 *   - incomingPatients:   Number of patients currently in queue
 *   - capacityPercentage: (expectedOccupancy / totalBeds) * 100
 */
export const fetchForecast = () => api.get('/forecast');

// ─────────────────────────────────────────────
//  WARDS
// ─────────────────────────────────────────────

/**
 * GET /api/wards
 * Returns an array of ward summaries grouped from the Bed collection by "ward" field:
 *   [{ name, totalBeds, occupiedBeds, availableBeds, cleaningBeds, percentage }, ...]
 * Used in the Multi-Ward View page.
 */
export const fetchWards = () => api.get('/wards');

// ─────────────────────────────────────────────
//  ALERTS
// ─────────────────────────────────────────────

/**
 * GET /api/alerts/check
 * Triggers the backend alert-check logic:
 *   - Beds in "cleaning" status for > 30 minutes → alert type "cleaning_delay"
 *   - Occupancy > 90% → alert type "over_capacity"
 *   - Patients with past dischargeDate still "admitted" → alert type "overstay"
 * Each alert is emitted via Socket.io event "alertCreated" to all connected clients.
 */
export const checkAlerts = () => api.get('/alerts/check');
