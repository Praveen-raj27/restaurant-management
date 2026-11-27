
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import {
  IndianRupee,
  ShoppingBag,
  Armchair,
  Users,
} from "lucide-react";

import StatCard from "./components/StatCard";
import RevenueChart from "./components/RevenueChart";
import RecentOrders from "./components/RecentOrders";
import TableOccupancy from "./components/TableOccupancy";
import PopularMenuItems from "./components/PopularMenuItems";

import tableService from "../tables/tableService";
import employeeService from "../employees/employeeService";

import "./Dashboard.css";

function Dashboard() {
  const role = useSelector(
    (state) => state.auth.membership?.role?.name
  );

  const canViewManagementDashboard = [
    "OWNER",
    "MANAGER",
  ].includes(role);

  const canViewTables = [
    "OWNER",
    "MANAGER",
    "WAITER",
  ].includes(role);

  const canViewEmployees = [
    "OWNER",
    "MANAGER",
  ].includes(role);

  const [activeTab, setActiveTab] = useState("overview");

  // Table states
  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tablesError, setTablesError] = useState("");

  // Employee states
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState("");

  // Available tabs based on role
  const tabs = [
    { id: "overview", label: "Overview" },
    ...(canViewManagementDashboard
      ? [{ id: "analytics", label: "Analytics" }]
      : []),
    ...(canViewTables
      ? [{ id: "occupancy", label: "Table Occupancy" }]
      : []),
  ];

  // Fetch tables
  const fetchTables = useCallback(async () => {
    if (!canViewTables) return;

    try {
      setTablesError("");

      const response = await tableService.getTables({
        page: 1,
        limit: 100,
        isActive: true,
      });

      setTables(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setTablesError(
        error.response?.data?.message ||
          "Unable to load table information."
      );
    } finally {
      setTablesLoading(false);
    }
  }, [canViewTables]);

  // Fetch active employee count
  const fetchActiveEmployees = useCallback(async () => {
    if (!canViewEmployees) return;

    try {
      setEmployeesError("");

      const response = await employeeService.getEmployees({
        page: 1,
        limit: 1,
        status: "ACTIVE",
      });

      setActiveEmployees(response.pagination.total);
    } catch (error) {
      setEmployeesError(
        error.response?.data?.message ||
          "Unable to load employee information."
      );
    } finally {
      setEmployeesLoading(false);
    }
  }, [canViewEmployees]);

  // Initial fetch and automatic refresh
  useEffect(() => {
    if (canViewTables) {
      fetchTables();
    } else {
      setTablesLoading(false);
    }

    if (canViewEmployees) {
      fetchActiveEmployees();
    } else {
      setEmployeesLoading(false);
    }

    const intervalId = setInterval(() => {
      if (canViewTables) {
        fetchTables();
      }

      if (canViewEmployees) {
        fetchActiveEmployees();
      }
    }, 15000);

    return () => clearInterval(intervalId);
  }, [
    fetchTables,
    fetchActiveEmployees,
    canViewTables,
    canViewEmployees,
  ]);

  // Calculate table occupancy
  const occupiedCount = tables.filter(
    (table) => table.status === "OCCUPIED"
  ).length;

  const totalTables = tables.length;

  const occupancyPercentage =
    totalTables > 0
      ? Math.round((occupiedCount / totalTables) * 100)
      : 0;

  // Management dashboard statistics
  const managementStats = [
    {
      title: "Today's Revenue",
      value: "₹48,250",
      change: "+12.5%",
      trend: "up",
      icon: IndianRupee,
      description: "vs yesterday",
    },
    {
      title: "Total Orders",
      value: "124",
      change: "+8.2%",
      trend: "up",
      icon: ShoppingBag,
      description: "vs yesterday",
    },
    {
      title: "Occupied Tables",
      value: tablesLoading
        ? "Loading..."
        : tablesError
          ? "--"
          : `${occupiedCount} / ${totalTables}`,
      change: tablesLoading
        ? "--"
        : tablesError
          ? "--"
          : `${occupancyPercentage}%`,
      trend: "up",
      icon: Armchair,
      description: tablesError
        ? "Unable to load tables"
        : "Current occupancy",
    },
    {
      title: "Active Employees",
      value: employeesLoading
        ? "Loading..."
        : employeesError
          ? "--"
          : activeEmployees,
      change: employeesLoading
        ? "--"
        : employeesError
          ? "--"
          : "Live",
      trend: "up",
      icon: Users,
      description: employeesError
        ? "Unable to load employees"
        : "Active team members",
    },
  ];

  // Waiter dashboard statistics
  const waiterStats = [
    {
      title: "Occupied Tables",
      value: tablesLoading
        ? "Loading..."
        : tablesError
          ? "--"
          : `${occupiedCount} / ${totalTables}`,
      change: tablesLoading
        ? "--"
        : tablesError
          ? "--"
          : `${occupancyPercentage}%`,
      trend: "up",
      icon: Armchair,
      description: tablesError
        ? "Unable to load tables"
        : "Current occupancy",
    },
  ];

  const stats = canViewManagementDashboard
    ? managementStats
    : role === "WAITER"
      ? waiterStats
      : [];

  const pageTitle = {
    overview: "Dashboard Overview",
    analytics: "Restaurant Analytics",
    occupancy: "Table Occupancy",
  };

  const pageDescription = {
    overview:
      "Here's what's happening at your restaurant today.",
    analytics:
      "Track revenue and understand your restaurant performance.",
    occupancy:
      "Monitor table availability across your restaurant.",
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>{pageTitle[activeTab]}</h1>
          <p>{pageDescription[activeTab]}</p>
        </div>
      </div>

      {tabs.length > 1 && (
        <div
          className="dashboard-tabs"
          role="tablist"
          aria-label="Dashboard sections"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`dashboard-tab ${
                activeTab === tab.id ? "active" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="dashboard-tab-content">
        {activeTab === "overview" && (
          <>
            {stats.length > 0 ? (
              <div className="stats-grid">
                {stats.map((stat) => (
                  <StatCard key={stat.title} {...stat} />
                ))}
              </div>
            ) : (
              <div className="dashboard-placeholder">
                <h2>Your workspace is being prepared</h2>
                <p>
                  Relevant dashboard information and tools
                  will appear here as your role modules become
                  available.
                </p>
              </div>
            )}

            {canViewManagementDashboard && <RecentOrders />}
          </>
        )}

        {activeTab === "analytics" &&
          canViewManagementDashboard && (
            <div className="analytics-content">
              <RevenueChart />
              <PopularMenuItems />
            </div>
          )}

        {activeTab === "occupancy" && canViewTables && (
          <TableOccupancy
            tables={tables}
            loading={tablesLoading}
            error={tablesError}
            onRetry={fetchTables}
          />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
