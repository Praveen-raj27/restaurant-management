
import api from '../../services/api';

const tableService = {
  // Get tables with pagination, search and filters
  getTables: async (params = {}) => {
    const response = await api.get('/tables', { params });
    return response.data;
  },

  // Get a single table
  getTable: async (id) => {
    const response = await api.get(`/tables/${id}`);
    return response.data;
  },

  // Create a table
  createTable: async (tableData) => {
    const response = await api.post('/tables', tableData);
    return response.data;
  },

  // Update table details
  updateTable: async (id, tableData) => {
    const response = await api.patch(
      `/tables/${id}`,
      tableData
    );
    return response.data;
  },

  // Update operational status
  updateTableStatus: async (id, status) => {
    const response = await api.patch(
      `/tables/${id}/status`,
      { status }
    );
    return response.data;
  },

  // Deactivate a table
  deleteTable: async (id) => {
    const response = await api.delete(`/tables/${id}`);
    return response.data;
  },

  // Regenerate table QR token
  regenerateTableQr: async (id) => {
    const response = await api.post(
      `/tables/${id}/qr/regenerate`
    );
    return response.data;
  },
};

export default tableService;
