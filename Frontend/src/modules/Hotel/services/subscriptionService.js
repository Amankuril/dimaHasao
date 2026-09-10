import axios from 'axios';
import { axiosInstance } from '../app/admin/store/adminStore';
import { api } from './apiService';

const subscriptionService = {
    // --- ADMIN ---
    createPlan: async (planData) => {
        const response = await axiosInstance.post('/subscriptions/admin/create', planData);
        return response.data;
    },

    getAllPlans: async () => {
        const response = await axiosInstance.get('/subscriptions/admin/all');
        return response.data;
    },

    updatePlan: async (id, planData) => {
        const response = await axiosInstance.put(`/subscriptions/admin/${id}`, planData);
        return response.data;
    },

    deletePlan: async (id) => {
        const response = await axiosInstance.delete(`/subscriptions/admin/${id}`);
        return response.data;
    },

    // --- PARTNER --- (use api instance which adds JWT token automatically)
    getActivePlans: async () => {
        const response = await api.get('/subscriptions/plans');
        return response.data;
    },

    getCurrentSubscription: async () => {
        const response = await api.get('/subscriptions/current');
        return response.data;
    },

    createSubscriptionOrder: async (planId) => {
        const response = await api.post('/subscriptions/checkout', { planId });
        return response.data;
    },

    verifySubscription: async (paymentData) => {
        const response = await api.post('/subscriptions/verify', paymentData);
        return response.data;
    },

    togglePause: async () => {
        const response = await api.post('/subscriptions/toggle-pause');
        return response.data;
    }
};


export default subscriptionService;
