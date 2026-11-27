
import api from "../../../services/api";

const menuImportService = {
 
uploadMenu: async (file) => {
  const formData = new FormData();
  formData.append("menu", file);

  const response = await api.post(
    "/menu/imports/upload",
    formData,
    {
      headers: {
        "Content-Type": undefined,
      },
    }
  );

  return response.data;
},


  getImport: async (id) => {
    const response = await api.get(`/menu/imports/${id}`);
    return response.data;
  },

  getImports: async (params = {}) => {
    const response = await api.get("/menu/imports", { params });
    return response.data;
  },

  reviewImport: async (id, pages) => {
    const response = await api.patch(`/menu/imports/${id}/review`, {
      pages,
    });
    return response.data;
  },

  approveImport: async (id) => {
    const response = await api.post(`/menu/imports/${id}/approve`);
    return response.data;
  },

  retryImport: async (id) => {
    const response = await api.post(`/menu/imports/${id}/retry`);
    return response.data;
  },
};

export default menuImportService;
