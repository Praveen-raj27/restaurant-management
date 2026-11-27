
import { Navigate, Outlet, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { ShieldAlert } from "lucide-react";

import "./AccessDenied.css";

function AccessDenied() {
  return (
    <div className="access-denied-page">
      <div className="access-denied-card">
        <div className="access-denied-icon">
          <ShieldAlert />
        </div>

        <h1>Access Denied</h1>

        <p>
          You don't have permission to access this page.
          Please contact your restaurant administrator if
          you believe this is a mistake.
        </p>

        <div className="access-denied-actions">
          <Link
            to="/dashboard"
            className="access-denied-button"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ allowedRoles }) {
  const {
    isAuthenticated,
    isInitializing,
    membership,
  } = useSelector((state) => state.auth);

  if (isInitializing) {
    return <div>Checking your session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const userRole = membership?.role?.name;

    if (!allowedRoles.includes(userRole)) {
      return <AccessDenied />;
    }
  }

  return <Outlet />;
}

export default ProtectedRoute;
