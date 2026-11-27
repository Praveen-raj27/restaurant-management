
import api from "../../services/api";

const getKitchenOrders = async () => {
  const response = await api.get("/kitchen/orders");
  return response.data;
};

const updateKitchenOrderStatus = async (orderId, status) => {
  const response = await api.patch(
    `/kitchen/orders/${orderId}/status`,
    { status },
  );

  return response.data;
};

const kitchenService = {
  getKitchenOrders,
  updateKitchenOrderStatus,
};

export default kitchenService;
