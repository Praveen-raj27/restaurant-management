
import api from "../../services/api";

const guestService = {
  getMenu: async (qrToken) => {
    const response = await api.post("/public/tables/menu", {
      qrToken,
    });

    return response.data;
  },
};

export default guestService;
