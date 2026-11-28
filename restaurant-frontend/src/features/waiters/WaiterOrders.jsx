
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import {
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Wifi,
  WifiOff,
  PackageCheck,
  Hand,
  Utensils,
} from "lucide-react";

import { getRestaurantSocket } from "../../services/socket";
import waiterService from "./waiterService";

import "./WaiterOrders.css";

function WaiterOrders() {
  const accessToken = useSelector(
    (state) => state.auth.accessToken
  );

  const membership = useSelector(
    (state) => state.auth.membership
  );

  const membershipId = membership?.id;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);

  const fetchOrders = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) {
        setRefreshing(true);
      }

      const response = await waiterService.getWaiterOrders();

      const orderList = Array.isArray(response)
        ? response
        : response?.data || response?.orders || [];

      setOrders(orderList);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to retrieve your orders."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Use the shared restaurant Socket.IO connection.
  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      setSocketConnected(false);
      return;
    }

    const socket = getRestaurantSocket(accessToken);

    if (!socket) return;

    const handleConnect = () => {
      setSocketConnected(true);

      // Recover orders missed during disconnection.
      fetchOrders();
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleConnectError = (err) => {
      console.error(
        "Waiter socket connection error:",
        err.message
      );

      setSocketConnected(false);
    };

    // Refetch from the backend so each waiter only
    // receives orders belonging to their membership.
    const handleOrderUpdate = () => {
      fetchOrders();
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    socket.on("order:new", handleOrderUpdate);
    socket.on("order:updated", handleOrderUpdate);
    socket.on("waiter:order:updated", handleOrderUpdate);
    socket.on("waiter:session:assigned", handleOrderUpdate);
    socket.on("waiter:session:unassigned", handleOrderUpdate);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);

      socket.off("order:new", handleOrderUpdate);
      socket.off("order:updated", handleOrderUpdate);
      socket.off("waiter:order:updated", handleOrderUpdate);
      socket.off("waiter:session:assigned", handleOrderUpdate);
      socket.off("waiter:session:unassigned", handleOrderUpdate);

      // Do not disconnect the shared socket.
    };
  }, [accessToken, fetchOrders]);

  const handleOrderAction = async (orderId, action) => {
    try {
      setUpdatingId(orderId);
      setError("");

      if (action === "claim") {
        await waiterService.claimOrder(orderId);
      } else if (action === "pickup") {
        await waiterService.pickupOrder(orderId);
      } else if (action === "serve") {
        await waiterService.serveOrder(orderId);
      }

      await fetchOrders();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update this order."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const formatTime = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getElapsedTime = (date) => {
    if (!date) return "—";

    const minutes = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(date).getTime()) / 60000
      )
    );

    return `${minutes} min ago`;
  };

  const getOrderAction = (order) => {
    if (
      order.status === "READY" &&
      !order.waiterMembershipId
    ) {
      return {
        label: "Claim Order",
        action: "claim",
        icon: Hand,
      };
    }

    if (order.status === "READY") {
      return {
        label: "Pick Up Order",
        action: "pickup",
        icon: PackageCheck,
      };
    }

    if (order.status === "PICKED_UP") {
      return {
        label: "Mark as Served",
        action: "serve",
        icon: CheckCircle2,
      };
    }

    return null;
  };

  const readyCount = orders.filter(
    (order) => order.status === "READY"
  ).length;

  const pickedUpCount = orders.filter(
    (order) => order.status === "PICKED_UP"
  ).length;

  const preparingCount = orders.filter(
    (order) => order.status === "PREPARING"
  ).length;

  if (loading) {
    return (
      <div className="waiter-orders-loading">
        <LoaderCircle className="spin" size={28} />
        <p>Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="page-container waiter-orders-page">
      <div className="page-header waiter-orders-header">
        <div>
          <h1>My Orders</h1>
          <p>
            Manage your assigned orders and serve your customers.
          </p>
        </div>

        <div className="waiter-orders-header-actions">
          <div
            className={`waiter-connection-status ${
              socketConnected ? "connected" : "disconnected"
            }`}
          >
            {socketConnected ? (
              <Wifi size={16} />
            ) : (
              <WifiOff size={16} />
            )}

            <span>
              {socketConnected ? "Live" : "Reconnecting..."}
            </span>
          </div>

          <button
            className="waiter-refresh-button"
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
      </div>

      <div className="waiter-orders-summary">
        <div className="waiter-orders-summary-card">
          <span>Preparing</span>
          <strong>{preparingCount}</strong>
        </div>

        <div className="waiter-orders-summary-card">
          <span>Ready for Pickup</span>
          <strong>{readyCount}</strong>
        </div>

        <div className="waiter-orders-summary-card">
          <span>Picked Up</span>
          <strong>{pickedUpCount}</strong>
        </div>
      </div>

      {error && (
        <div className="waiter-orders-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="waiter-orders-empty content-card">
          <Utensils size={42} />
          <h3>No active orders</h3>
          <p>
            New orders assigned to you will appear here.
          </p>
        </div>
      ) : (
        <div className="waiter-orders-grid">
          {orders.map((order) => {
            const action = getOrderAction(order);
            const ActionIcon = action?.icon;

            return (
              <article
                className={`waiter-order-card status-${order.status.toLowerCase()}`}
                key={order.id}
              >
                <div className="waiter-order-header">
                  <div>
                    <span className="waiter-order-label">
                      ORDER
                    </span>

                    <h3>
                      #{order.id.slice(0, 8).toUpperCase()}
                    </h3>
                  </div>

                  <span
                    className={`waiter-order-status status-${order.status.toLowerCase()}`}
                  >
                    {order.status.replace("_", " ")}
                  </span>
                </div>

                <div className="waiter-order-meta">
                  <div>
                    <span>Table</span>
                    <strong>
                      {order.table?.tableNumber ?? "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Placed at</span>
                    <strong>
                      {formatTime(order.placedAt)}
                    </strong>
                  </div>

                  <div>
                    <span>Waiting</span>
                    <strong>
                      {getElapsedTime(order.placedAt)}
                    </strong>
                  </div>
                </div>

                <div className="waiter-order-items">
                  <h4>Order Items</h4>

                  {(order.items || []).map((item) => (
                    <div
                      className="waiter-order-item"
                      key={item.id}
                    >
                      <div className="waiter-item-info">
                        <strong>{item.itemName}</strong>

                        {item.variantName && (
                          <span>{item.variantName}</span>
                        )}

                        {item.notes && (
                          <p>Note: {item.notes}</p>
                        )}
                      </div>

                      <strong className="waiter-item-quantity">
                        × {item.quantity}
                      </strong>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <div className="waiter-order-notes">
                    <strong>Order instructions</strong>
                    <p>{order.notes}</p>
                  </div>
                )}

                {action && (
                  <button
                    className={`waiter-order-action action-${action.action}`}
                    onClick={() =>
                      handleOrderAction(order.id, action.action)
                    }
                    disabled={updatingId === order.id}
                  >
                    {updatingId === order.id ? (
                      <LoaderCircle
                        className="spin"
                        size={17}
                      />
                    ) : (
                      <ActionIcon size={17} />
                    )}

                    {updatingId === order.id
                      ? "Updating..."
                      : action.label}
                  </button>
                )}

                {order.status === "PLACED" && (
                  <div className="waiter-order-message">
                    <Clock size={17} />
                    Waiting for kitchen to start preparing
                  </div>
                )}

                {order.status === "PREPARING" && (
                  <div className="waiter-order-message">
                    <Clock size={17} />
                    Kitchen is preparing this order
                  </div>
                )}

                <div className="waiter-order-footer">
                  <Clock size={14} />
                  <span>Real-time order updates enabled</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WaiterOrders;
