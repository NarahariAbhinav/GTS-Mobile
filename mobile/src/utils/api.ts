import { auth } from './firebaseConfig';
import axios from 'axios';
import { Platform } from 'react-native';

// Production backend on Google Cloud Run (asia-south1 / Mumbai)
const BASE_URL = 'https://gts-backend-163192454816.asia-south1.run.app/api';

const api = axios.create({ baseURL: BASE_URL });

// === AXIOS INTERCEPTOR: Auto-attach Firebase ID token to every request ===
api.interceptors.request.use(async (config) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        const idToken = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${idToken}`;
    }
    return config;
}, (error) => Promise.reject(error));

// === AUTH (Firebase) ===
// The mobile app now signs in via Firebase Auth SDK directly.
// After sign-in, the ID token is sent to backend to fetch the employee profile.
export const loginWithFirebase = async () => {
    const response = await api.post('/login'); // token auto-attached by interceptor
    return response.data;
};

// === DASHBOARD ===
export const getDashboardStats = async () => {
    const response = await api.get('/dashboard');
    return response.data;
};

export const sendDailyReportEmail = async (email: string) => {
    const response = await api.post('/admin/send-report', { email });
    return response.data;
};

// === EMPLOYEES ===
export const getEmployees = async () => {
    const response = await api.get('/employees');
    return response.data;
};

export const getEmployeesPaginated = async (limit: number, startAfter?: string, search?: string) => {
    const params: any = { limit };
    if (startAfter) params.startAfter = startAfter;
    if (search) params.search = search;
    const response = await api.get('/employees', { params });
    return response.data;
};

export const addEmployee = async (data: any) => {
    const response = await api.post('/employees', data);
    return response.data;
};

export const updateEmployee = async (id: string, data: any) => {
    const response = await api.put(`/employees/${id}`, data);
    return response.data;
};

export const deleteEmployee = async (id: string) => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
};

// === SAMPLES ===
export const getSamples = async () => {
    const response = await api.get('/samples');
    return response.data;
};

export const getSamplesPaginated = async (limit: number, startAfter?: string, search?: string) => {
    const params: any = { limit };
    if (startAfter) params.startAfter = startAfter;
    if (search) params.search = search;
    const response = await api.get('/samples', { params });
    return response.data;
};

export const addSample = async (data: any) => {
    const response = await api.post('/samples', data);
    return response.data;
};

export const updateSample = async (id: string, data: any) => {
    const response = await api.put(`/samples/${id}`, data);
    return response.data;
};

export const bulkAddSamples = async (samples: { sample_name: string; style_number: string; developed_for: string }[]) => {
    const response = await api.post('/samples/bulk', { samples });
    return response.data;
};

// === HANDOVER (Two-Step Transfer) ===
export const transferSample = async (data: any) => {
    const response = await api.post('/handover', data);
    return response.data;
};

export const acceptTransfer = async (transactionId: string) => {
    const response = await api.post(`/handover/${transactionId}/accept`);
    return response.data;
};

export const rejectTransfer = async (transactionId: string, rejection_reason?: string) => {
    const response = await api.post(`/handover/${transactionId}/reject`, { rejection_reason });
    return response.data;
};

// === PENDING TRANSFERS ===
export const getPendingTransfers = async (employeeId: string) => {
    const response = await api.get(`/pending-transfers/${employeeId}`);
    return response.data;
};

// === MY SAMPLES ===
export const getMySamples = async (employeeId: string) => {
    const response = await api.get(`/my-samples/${employeeId}`);
    return response.data;
};

// === TIMELINE ===
export const getSampleHistory = async (id: string) => {
    const response = await api.get(`/samples/${id}/history`);
    return response.data;
};

export const getTimeline = getSampleHistory;

// === NOTIFICATIONS ===
export const getNotifications = async (employeeId: string) => {
    const response = await api.get(`/notifications/${employeeId}`);
    return response.data;
};

export const markNotificationRead = async (notificationId: string) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
};

export const markAllNotificationsRead = async (employeeId: string) => {
    const response = await api.put(`/notifications/read-all/${employeeId}`);
    return response.data;
};

export default api;
