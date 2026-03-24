import apiClient from './apiClient';

export const authService = {
  signup: (data: { name: string; email: string; password: string; charityId?: string }) =>
    apiClient.post('/auth/signup', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data).then((r) => r.data),

  getMe: () => apiClient.get('/auth/me').then((r) => r.data),

  updateMe: (data: { name?: string; charityId?: string; donationPercentage?: number }) =>
    apiClient.put('/auth/me', data).then((r) => r.data),
};

export const subscriptionService = {
  createCheckout: (plan: 'monthly' | 'yearly') =>
    apiClient.post('/subscriptions/checkout', { plan }).then((r) => r.data),

  createPortal: () =>
    apiClient.post('/subscriptions/portal').then((r) => r.data),

  getStatus: () =>
    apiClient.get('/subscriptions/status').then((r) => r.data),
};

export const scoreService = {
  getScores: () => apiClient.get('/scores').then((r) => r.data),

  addScore: (value: number) =>
    apiClient.post('/scores', { value }).then((r) => r.data),
};

export const drawService = {
  getCurrentDraw: () => apiClient.get('/draws/current').then((r) => r.data),

  getDraws: (page = 1, limit = 10) =>
    apiClient.get(`/draws?page=${page}&limit=${limit}`).then((r) => r.data),

  getDrawById: (id: string) =>
    apiClient.get(`/draws/${id}`).then((r) => r.data),

  simulate: (type: 'random' | 'algorithm') =>
    apiClient.post('/draws/simulate', { type }).then((r) => r.data),

  execute: (type: 'random' | 'algorithm') =>
    apiClient.post('/draws/execute', { type }).then((r) => r.data),

  getRollover: () =>
    apiClient.get('/draws/rollover').then((r) => r.data),
};

export const charityService = {
  getCharities: () => apiClient.get('/charities').then((r) => r.data),

  getCharity: (id: string) =>
    apiClient.get(`/charities/${id}`).then((r) => r.data),

  createCharity: (data: object) =>
    apiClient.post('/charities', data).then((r) => r.data),

  updateCharity: (id: string, data: object) =>
    apiClient.put(`/charities/${id}`, data).then((r) => r.data),

  deleteCharity: (id: string) =>
    apiClient.delete(`/charities/${id}`).then((r) => r.data),

  getStats: () =>
    apiClient.get('/charities/stats').then((r) => r.data),
};

export const winnerService = {
  getMyWinnings: () => apiClient.get('/winners/my').then((r) => r.data),

  uploadProof: (winnerId: string, file: File) => {
    const form = new FormData();
    form.append('proof', file);
    return apiClient
      .post(`/winners/${winnerId}/proof`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  getAllWinners: (params?: { status?: string; drawId?: string; page?: number; limit?: number }) =>
    apiClient.get('/winners', { params }).then((r) => r.data),

  verifyWinner: (winnerId: string, status: 'approved' | 'rejected', notes?: string) =>
    apiClient.put(`/winners/${winnerId}/verify`, { status, notes }).then((r) => r.data),
};

export const adminService = {
  getAnalytics: () => apiClient.get('/admin/analytics').then((r) => r.data),
  getRevenue: () => apiClient.get('/admin/analytics/revenue').then((r) => r.data),
  getCharityBreakdown: () => apiClient.get('/admin/analytics/charities').then((r) => r.data),
  getDrawParticipation: () => apiClient.get('/admin/analytics/draws').then((r) => r.data),
  getUserGrowth: () => apiClient.get('/admin/analytics/growth').then((r) => r.data),

  getUsers: (page = 1, search?: string) =>
    apiClient.get('/admin/users', { params: { page, search } }).then((r) => r.data),

  getUser: (id: string) =>
    apiClient.get(`/admin/users/${id}`).then((r) => r.data),

  updateUserSubscription: (id: string, subscriptionStatus: string) =>
    apiClient.put(`/admin/users/${id}/subscription`, { subscriptionStatus }).then((r) => r.data),

  deactivateUser: (id: string) =>
    apiClient.delete(`/admin/users/${id}`).then((r) => r.data),
};
