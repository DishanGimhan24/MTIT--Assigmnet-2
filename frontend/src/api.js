import axios from 'axios';

const BASE = 'http://localhost:3000/api';

export const productsApi = {
  getAll: () => axios.get(`${BASE}/products`),
  getOne: (id) => axios.get(`${BASE}/products/${id}`),
  create: (data) => axios.post(`${BASE}/products`, data),
  update: (id, data) => axios.put(`${BASE}/products/${id}`, data),
  delete: (id) => axios.delete(`${BASE}/products/${id}`),
};

export const customersApi = {
  getAll: () => axios.get(`${BASE}/customers`),
  getOne: (id) => axios.get(`${BASE}/customers/${id}`),
  create: (data) => axios.post(`${BASE}/customers`, data),
  update: (id, data) => axios.put(`${BASE}/customers/${id}`, data),
  delete: (id) => axios.delete(`${BASE}/customers/${id}`),
};

export const ordersApi = {
  getAll: () => axios.get(`${BASE}/orders`),
  getOne: (id) => axios.get(`${BASE}/orders/${id}`),
  create: (data) => axios.post(`${BASE}/orders`, data),
  update: (id, data) => axios.put(`${BASE}/orders/${id}`, data),
  delete: (id) => axios.delete(`${BASE}/orders/${id}`),
};

export const paymentsApi = {
  getAll: () => axios.get(`${BASE}/payments`),
  getOne: (id) => axios.get(`${BASE}/payments/${id}`),
  create: (data) => axios.post(`${BASE}/payments`, data),
  update: (id, data) => axios.put(`${BASE}/payments/${id}`, data),
  delete: (id) => axios.delete(`${BASE}/payments/${id}`),
};
