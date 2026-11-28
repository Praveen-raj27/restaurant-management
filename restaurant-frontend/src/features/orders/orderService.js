
import api from "../../services/api";

const orderService = {
  getOrderCount: async () => {
    const response = await api.get("/orders/count");
    return response.data;
  },

  getRecentOrders: async () => {
    const response = await api.get("/orders/recent");
    return response.data;
  },
};

export default orderService;
