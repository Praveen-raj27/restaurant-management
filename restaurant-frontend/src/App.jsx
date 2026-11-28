
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./features/auth/Login";
import Register from "./features/auth/Register";
import Dashboard from "./features/dashboard/Dashboard";

import ProtectedRoute from "./components/common/ProtectedRoute";
import Employees from "./features/employees/Employees";
import Tables from "./features/tables/Tables";
import Categories from "./features/menu/categories/Categories";
import Items from "./features/menu/items/Items";
import MenuImport from "./features/menu/import/MenuImport";
import Kitchen from "./features/kitchen/Kitchen";
import GuestMenu from "./features/guest/GuestMenu";
import Waiters from "./features/waiters/Waiters";
import WaiterOrders from "./features/waiters/WaiterOrders";

import authService from "./features/auth/authService";

import {
  setCredentials,
  clearCredentials,
  setInitializing,
} from "./features/auth/authSlice";

import AppLayout from "./components/layout/AppLayout";

// Prevent duplicate refresh calls during React StrictMode checks
let sessionInitializationPromise = null;

const MANAGEMENT_ROLES = ["OWNER", "MANAGER"];
const TABLE_ROLES = ["OWNER", "MANAGER", "WAITER"];
const KITCHEN_ROLES = ["OWNER", "MANAGER", "KITCHEN_STAFF"];
const WAITER_ROLES = ["WAITER"];

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
      <Route path="/register" element={<Register />} />
      <Route path="/menu" element={<GuestMenu />} />

      {/* Authentication protection */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* All authenticated roles */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* OWNER and MANAGER only */}
          <Route element={<ProtectedRoute allowedRoles={MANAGEMENT_ROLES} />}>
            <Route path="/employees" element={<Employees />} />
            <Route path="/waiters" element={<Waiters />} />
            <Route path="/menu/categories" element={<Categories />} />
            <Route path="/menu/items" element={<Items />} />
            <Route path="/menu/import" element={<MenuImport />} />
          </Route>

          {/* OWNER, MANAGER and WAITER */}
          <Route element={<ProtectedRoute allowedRoles={TABLE_ROLES} />}>
            <Route path="/tables" element={<Tables />} />
          </Route>

          {/* OWNER, MANAGER and KITCHEN_STAFF */}
          <Route element={<ProtectedRoute allowedRoles={KITCHEN_ROLES} />}>
            <Route path="/kitchen" element={<Kitchen />} />
          </Route>

          {/* WAITER only */}
          <Route element={<ProtectedRoute allowedRoles={WAITER_ROLES} />}>
            <Route path="/waiter/orders" element={<WaiterOrders />} />
          </Route>
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
