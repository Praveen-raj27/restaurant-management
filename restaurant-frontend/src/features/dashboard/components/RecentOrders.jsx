
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import {
  Clock,
  CheckCircle,
  ChefHat,
  XCircle,
  RefreshCw,
} from "lucide-react";

import { getRestaurantSocket } from "../../../services/socket";
import orderService from "../../orders/orderService";

const statusConfig = {
  PLACED: {
    label: "Pending",
    className: "pending",
    icon: Clock,
  },
  PREPARING: {
    label: "Preparing",
    className: "preparing",
    icon: ChefHat,
  },
  READY: {
    label: "Ready",
    className: "completed",
    icon: CheckCircle,
  },
  SERVED: {
    label: "Served",
    className: "completed",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Cancelled",
    className: "cancelled",
    icon: XCircle,
  },
};

const formatAmount = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatTime = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getItemsSummary = (items = []) => {
  if (!items.length) return "No items";

  const visibleItems = items.slice(0, 2).map(
    (item) => `${item.quantity} × ${item.itemName}`
  );

  const remaining = items.length - visibleItems.length;

  return remaining > 0
    ? `${visibleItems.join(", ")} +${remaining} more`
    : visibleItems.join(", ");
};

function RecentOrders() {
  const accessToken = useSelector(
    (state) => state.auth.accessToken
  );

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchRecentOrders = useCallback(async () => {
    try {
      const response = await orderService.getRecentOrders();

      setOrders(response.data || []);
      setError("");
    } catch (err) {
      console.error("Failed to fetch recent orders:", err);
      setError("Unable to load recent orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch only. No polling.
  useEffect(() => {
    fetchRecentOrders();
  }, [fetchRecentOrders, refreshKey]);

  // Real-time order updates.
  useEffect(() => {
    if (!accessToken) return;

    const socket = getRestaurantSocket(accessToken);

    if (!socket) return;

    const handleNewOrder = (newOrder) => {
      setOrders((currentOrders) => {
        const filteredOrders = currentOrders.filter(
          (order) => order.id !== newOrder.id
        );

        return [newOrder, ...filteredOrders].slice(0, 5);
      });

      setError("");
    };

    const handleOrderUpdated = (updatedOrder) => {
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === updatedOrder.id
            ? { ...order, ...updatedOrder }
            : order
        )
      );
    };

    socket.on("order:new", handleNewOrder);
    socket.on("order:updated", handleOrderUpdated);

    return () => {
      socket.off("order:new", handleNewOrder);
      socket.off("order:updated", handleOrderUpdated);
    };
  }, [accessToken]);

  const handleRetry = () => {
    setLoading(true);
    setRefreshKey((previous) => previous + 1);
  };

  return (
    <div className="recent-orders-card">
      <div className="section-card-header">
        <div>
          <h3>Recent Orders</h3>
          <p>Latest activity from your restaurant</p>
        </div>

        <button
          type="button"
          className="refresh-orders-button"
          onClick={handleRetry}
          disabled={loading}
          aria-label="Refresh recent orders"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="orders-list">
        {loading ? (
          <div className="orders-message">
            Loading recent orders...
          </div>
        ) : error ? (
          <div className="orders-message orders-error">
            <p>{error}</p>
            <button type="button" onClick={handleRetry}>
              Try again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="orders-message">
            No orders found yet.
          </div>
        ) : (
          orders.map((order) => {
            const status = statusConfig[order.status] || {
              label: order.status,
              className: "pending",
              icon: Clock,
            };

            const StatusIcon = status.icon;

            return (
              <div className="order-row" key={order.id}>
                <div className="order-main">
                  <div className="order-id">
                    #{order.id.slice(-6).toUpperCase()}
                  </div>

                  <div className="order-details">
                    {order.table
                      ? `Table ${order.table.tableNumber} · `
                      : ""}
                    {getItemsSummary(order.items)}
                  </div>

                  <div className="order-time">
                    {formatTime(order.createdAt)}
                  </div>
                </div>

                <div className="order-side">
                  <strong>
                    {formatAmount(order.totalAmount)}
                  </strong>

                  <span
                    className={`order-status ${status.className}`}
                  >
                    <StatusIcon size={13} />
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default RecentOrders;
