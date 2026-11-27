
import api from "../../../services/api";

const categoryService = {
  getCategories: async (params = {}) => {
    const response = await api.get("/menu/categories", { params });
    return response.data;
  },

  getCategory: async (id) => {
    const response = await api.get(`/menu/categories/${id}`);
    return response.data;
  },

  createCategory: async (categoryData) => {
    const response = await api.post("/menu/categories", categoryData);
    return response.data;
  },

  updateCategory: async (id, categoryData) => {
    const response = await api.patch(
      `/menu/categories/${id}`,
      categoryData
    );
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await api.delete(`/menu/categories/${id}`);
    return response.data;
  },
};

export default categoryService;
