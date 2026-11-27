import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useSelector(
    (state) => state.auth
  );

  // Wait until session restoration is complete
  if (isInitializing) {
    return <div>Checking your session...</div>;
  }

  // Redirect unauthenticated users
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;