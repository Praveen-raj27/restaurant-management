import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./features/auth/Login";
import Dashboard from "./features/dashboard/Dashboard";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Employees from './features/employees/Employees';
import Tables from './features/tables/Tables';
import Categories from "./features/menu/categories/Categories";
import Items from "./features/menu/items/Items";

import authService from "./features/auth/authService";
import {
  setCredentials,
  clearCredentials,
  setInitializing,
} from "./features/auth/authSlice";

import AppLayout from "./components/layout/AppLayout";

// Prevent duplicate refresh calls during React StrictMode development checks
let sessionInitializationPromise = null;

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!sessionInitializationPromise) {
      sessionInitializationPromise = authService
        .refresh()
        .then((response) => {
          dispatch(setCredentials(response.data));
        })
        .catch(() => {
          dispatch(clearCredentials());
        })
        .finally(() => {
          dispatch(setInitializing(false));
        });
    }
  }, [dispatch]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/menu/categories" element={<Categories />} />
          <Route path="/menu/items" element={<Items />} />
        </Route>
      </Route>

      {/* Default route */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Unknown routes */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
