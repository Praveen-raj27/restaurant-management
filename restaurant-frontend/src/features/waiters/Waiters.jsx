import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Users, RefreshCw } from "lucide-react";

import {
  fetchWaiters,
  updateWaiterAvailability,
  clearWaiterError,
} from "./waiterSlice";

import "../employees/Employees.css";
import "./Waiters.css";

const availabilityOptions = [
  { value: "AVAILABLE", label: "Available" },
  { value: "BUSY", label: "Busy" },
  { value: "ON_BREAK", label: "On Break" },
  { value: "OFFLINE", label: "Offline" },
];

function Waiters() {
  const dispatch = useDispatch();

  const { waiters, loading, updating, error } = useSelector(
    (state) => state.waiters,
  );

  useEffect(() => {
    dispatch(fetchWaiters());

    return () => {
      dispatch(clearWaiterError());
    };
  }, [dispatch]);

  const handleAvailabilityChange = async (membershipId, availability) => {
    try {
      await dispatch(
        updateWaiterAvailability({
          membershipId,
          availability,
        }),
      ).unwrap();
    } catch {
      // Error is already stored in Redux.
    }
  };

  const getAvailabilityLabel = (availability) => {
    return (
      availabilityOptions.find((item) => item.value === availability)?.label ||
      availability
    );
  };

  const formatDate = (date) => {
    if (!date) return "Not updated";

    return new Date(date).toLocaleString();
  };

  const availableCount = waiters.filter(
    (waiter) => waiter.waiterAvailability === "AVAILABLE",
  ).length;

  return (
    <div className="employees-page">
      {/* Page Header */}
      <div className="employees-header">
        <div>
          <h1>Waiters</h1>
          <p>Manage waiter availability and restaurant floor operations.</p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => dispatch(fetchWaiters())}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {/* Waiter Summary */}
      <div className="waiter-summary">
        <div className="waiter-stat-card">
          <div className="waiter-stat-icon">👥</div>
          <div>
            <span>Total Waiters</span>
            <strong>{waiters.length}</strong>
          </div>
        </div>

        <div className="waiter-stat-card">
          <div className="waiter-stat-icon">✓</div>
          <div>
            <span>Available</span>
            <strong>
              {
                waiters.filter(
                  (waiter) => waiter.waiterAvailability === "AVAILABLE",
                ).length
              }
            </strong>
          </div>
        </div>
      </div>

      {/* Waiter Table */}
      <div className="employees-card">
        <div className="employees-card-header">
          <div>
            <h3>Waiter Availability</h3>
            <span>{waiters.length} waiters</span>
          </div>
        </div>

        {loading ? (
          <div className="employees-message">Loading waiters...</div>
        ) : error ? (
          <div className="employees-message error-message">{error}</div>
        ) : waiters.length === 0 ? (
          <div className="employees-empty">
            <Users size={32} />
            <h3>No waiters found</h3>
            <p>Add an employee with the Waiter role to get started.</p>
          </div>
        ) : (
          <div className="employees-table-wrapper">
            <table className="employees-table">
              <thead>
                <tr>
                  <th>Waiter</th>
                  <th>Phone</th>
                  <th>Availability</th>
                  <th>Last Updated</th>
                </tr>
              </thead>

              <tbody>
                {waiters.map((waiter) => (
                  <tr key={waiter.id}>
                    <td>
                      <div className="employee-name-cell">
                        <div className="employee-avatar">
                          {waiter.user.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <strong>{waiter.user.name}</strong>
                          <span>{waiter.user.email}</span>
                        </div>
                      </div>
                    </td>

                    <td>{waiter.user.phone || "—"}</td>

                    <td>
                      <div className="waiter-availability-control">
                        <span
                          className={`employee-status ${waiter.waiterAvailability.toLowerCase()}`}
                        >
                          {getAvailabilityLabel(waiter.waiterAvailability)}
                        </span>

                        <select
                          value={waiter.waiterAvailability}
                          disabled={updating}
                          aria-label={`Update availability for ${waiter.user.name}`}
                          onChange={(event) =>
                            handleAvailabilityChange(
                              waiter.id,
                              event.target.value,
                            )
                          }
                        >
                          {availabilityOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    <td>{formatDate(waiter.availabilityUpdatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Waiters;
