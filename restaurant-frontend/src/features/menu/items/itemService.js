
import api from "../../../services/api";

const itemService = {
    getItems: async (params = {}) => {
        const response = await api.get("/menu/items", { params });
        return response.data;
    },

    getItem: async (id) => {
        const response = await api.get(`/menu/items/${id}`);
        return response.data;
    },

    createItem: async (itemData) => {
        const response = await api.post("/menu/items", itemData);
        return response.data;
    },

    updateItem: async (id, itemData) => {
        const response = await api.patch(`/menu/items/${id}`, itemData);
        return response.data;
    },

    deleteItem: async (id) => {
        const response = await api.delete(`/menu/items/${id}`);
        return response.data;
    }
};

export default itemService;
