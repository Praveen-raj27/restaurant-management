
import api from '../../services/api';

const tableService = {
  getTables: async (params = {}) => {
    const response = await api.get('/tables', { params });
    return response.data;
  },

  getTable: async (id) => {
    const response = await api.get(`/tables/${id}`);
    return response.data;
  },

  createTable: async (tableData) => {
    const response = await api.post('/tables', tableData);
    return response.data;
  },

  updateTable: async (id, tableData) => {
    const response = await api.patch(`/tables/${id}`, tableData);
    return response.data;
  },

  updateTableStatus: async (id, status) => {
    const response = await api.patch(
      `/tables/${id}/status`,
      { status }
    );
    return response.data;
  },

  deleteTable: async (id) => {
    const response = await api.delete(`/tables/${id}`);
    return response.data;
  },

  regenerateTableQr: async (id) => {
    const response = await api.post(`/tables/${id}/qr/regenerate`);
    return response.data;
  },

  // Open a table session
  openTableSession: async (tableId) => {
    const response = await api.post('/table-sessions/open', {
      tableId,
    });
    return response.data;
  },

  // Close a table session
  closeTableSession: async (tableId) => {
    const response = await api.post('/table-sessions/close', {
      tableId,
    });
    return response.data;
  },
};

export default tableService;
