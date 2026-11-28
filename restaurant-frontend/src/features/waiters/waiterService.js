
import api from "../../services/api";

const waiterService = {
  // Get all active waiters.
  getWaiters: async () => {
    const response = await api.get("/waiters");
    return response.data;
  },

  // Update waiter availability.
  updateAvailability: async (membershipId, availability) => {
    const response = await api.patch(
      `/waiters/${membershipId}/availability`,
      { availability }
    );
    return response.data;
  },

  // Assign or reassign a waiter to a table session.
  assignWaiter: async (sessionId, waiterMembershipId) => {
    const response = await api.patch(
      `/waiters/sessions/${sessionId}/assign`,
      { waiterMembershipId }
    );
    return response.data;
  },

  // Get orders assigned to the current waiter.
  getWaiterOrders: async () => {
    const response = await api.get("/waiters/orders");
    return response.data;
  },

  // Claim an unassigned READY order.
  claimOrder: async (orderId) => {
    const response = await api.patch(
      `/waiters/orders/${orderId}/claim`
    );
    return response.data;
  },

  // Mark an assigned order as picked up.
  pickupOrder: async (orderId) => {
    const response = await api.patch(
      `/waiters/orders/${orderId}/pickup`
    );
    return response.data;
  },

  // Mark a picked-up order as served.
  serveOrder: async (orderId) => {
    const response = await api.patch(
      `/waiters/orders/${orderId}/serve`
    );
    return response.data;
  },
};

export default waiterService;
