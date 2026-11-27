
import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Clock,
  ChefHat,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";

import kitchenService from "./kitchenService";
import "./Kitchen.css";

const REFRESH_INTERVAL = 15000;

function Kitchen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) {
        setRefreshing(true);
      }

      const response = await kitchenService.getKitchenOrders();

      setOrders(response.data || []);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to retrieve kitchen orders.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId, status) => {
    try {
      setUpdatingId(orderId);
      setError("");

      await kitchenService.updateKitchenOrderStatus(orderId, status);

      await fetchOrders();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to update order status.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const getNextAction = (status) => {
    if (status === "PLACED") {
      return {
        label: "Start Preparing",
        nextStatus: "PREPARING",
        icon: ChefHat,
      };
    }

    if (status === "PREPARING") {
      return {
        label: "Mark Ready",
        nextStatus: "READY",
        icon: CheckCircle2,
      };
    }

    return null;
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getElapsedTime = (date) => {
    const minutes = Math.max(
      0,
      Math.floor((Date.now() - new Date(date).getTime()) / 60000),
    );

    return `${minutes} min ago`;
  };

  const placedCount = orders.filter(
    (order) => order.status === "PLACED",
  ).length;

  const preparingCount = orders.filter(
    (order) => order.status === "PREPARING",
  ).length;

  const readyCount = orders.filter(
    (order) => order.status === "READY",
  ).length;

  if (loading) {
    return (
      <div className="kitchen-loading">
        <LoaderCircle className="spin" size={28} />
        <p>Loading kitchen orders...</p>
      </div>
    );
  }

  return (
    <div className="page-container kitchen-page">
      <div className="page-header kitchen-header">
        <div>
          <h1>Kitchen Display</h1>
          <p>Manage incoming orders and preparation status.</p>
        </div>

        <button
          className="kitchen-refresh-button"
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "spin" : ""}
          />
          Refresh
        </button>
      </div>

      <div className="kitchen-summary">
        <div className="kitchen-summary-card">
          <span>New Orders</span>
          <strong>{placedCount}</strong>
        </div>

        <div className="kitchen-summary-card">
          <span>Preparing</span>
          <strong>{preparingCount}</strong>
        </div>

        <div className="kitchen-summary-card">
          <span>Ready</span>
          <strong>{readyCount}</strong>
        </div>
      </div>

      {error && (
        <div className="kitchen-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="kitchen-empty content-card">
          <ChefHat size={42} />
          <h3>No active orders</h3>
          <p>New orders will appear here automatically.</p>
        </div>
      ) : (
        <div className="kitchen-orders-grid">
          {orders.map((order) => {
            const action = getNextAction(order.status);
            const ActionIcon = action?.icon;

            return (
              <article
                className={`kitchen-order-card status-${order.status.toLowerCase()}`}
                key={order.id}
              >
                <div className="kitchen-order-header">
                  <div>
                    <span className="kitchen-order-label">
                      ORDER
                    </span>
                    <h3>#{order.id.slice(0, 8).toUpperCase()}</h3>
                  </div>

                  <span
                    className={`kitchen-status status-${order.status.toLowerCase()}`}
                  >
                    {order.status.replace("_", " ")}
                  </span>
                </div>

                <div className="kitchen-order-meta">
                  <div>
                    <span>Table</span>
                    <strong>
                      {order.table?.tableNumber ?? "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Placed at</span>
                    <strong>{formatTime(order.placedAt)}</strong>
                  </div>

                  <div>
                    <span>Waiting</span>
                    <strong>{getElapsedTime(order.placedAt)}</strong>
                  </div>
                </div>

                <div className="kitchen-order-items">
                  <h4>Order Items</h4>

                  {order.items.map((item) => (
                    <div className="kitchen-order-item" key={item.id}>
                      <div className="kitchen-item-info">
                        <strong>{item.itemName}</strong>

                        {item.variantName && (
                          <span>{item.variantName}</span>
                        )}

                        {item.notes && (
                          <p>Note: {item.notes}</p>
                        )}
                      </div>

                      <strong className="kitchen-item-quantity">
                        × {item.quantity}
                      </strong>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <div className="kitchen-order-notes">
                    <strong>Order instructions</strong>
                    <p>{order.notes}</p>
                  </div>
                )}

                {action && (
                  <button
                    className={`kitchen-action-button action-${action.nextStatus.toLowerCase()}`}
                    onClick={() =>
                      handleStatusUpdate(order.id, action.nextStatus)
                    }
                    disabled={updatingId === order.id}
                  >
                    {updatingId === order.id ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <ActionIcon size={17} />
                    )}

                    {updatingId === order.id
                      ? "Updating..."
                      : action.label}
                  </button>
                )}

                {order.status === "READY" && (
                  <div className="kitchen-ready-message">
                    <CheckCircle2 size={17} />
                    Ready for waiter pickup
                  </div>
                )}

                <div className="kitchen-order-footer">
                  <Clock size={14} />
                  <span>Updated automatically every 15 seconds</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Kitchen;
