
import { useCallback, useEffect, useState } from "react";
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

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "analytics", label: "Analytics" },
  { id: "occupancy", label: "Table Occupancy" },
];

function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // Table states
  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tablesError, setTablesError] = useState("");

  // Employee states
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState("");

  // Fetch tables
  const fetchTables = useCallback(async () => {
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
  }, []);

  // Fetch active employee count
  const fetchActiveEmployees = useCallback(async () => {
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
  }, []);

  // Initial fetch and automatic refresh
  useEffect(() => {
    fetchTables();
    fetchActiveEmployees();

    const intervalId = setInterval(() => {
      fetchTables();
      fetchActiveEmployees();
    }, 15000);

    return () => clearInterval(intervalId);
  }, [fetchTables, fetchActiveEmployees]);

  // Calculate table occupancy
  const occupiedCount = tables.filter(
    (table) => table.status === "OCCUPIED"
  ).length;

  const totalTables = tables.length;

  const occupancyPercentage =
    totalTables > 0
      ? Math.round((occupiedCount / totalTables) * 100)
      : 0;

  // Dashboard statistics
  const stats = [
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
        ? "unable to load tables"
        : "current occupancy",
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
        ? "unable to load employees"
        : "active team members",
    },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>
            {activeTab === "overview" && "Dashboard Overview"}
            {activeTab === "analytics" && "Restaurant Analytics"}
            {activeTab === "occupancy" && "Table Occupancy"}
          </h1>

          <p>
            {activeTab === "overview" &&
              "Here's what's happening at your restaurant today."}

            {activeTab === "analytics" &&
              "Track revenue and understand your restaurant performance."}

            {activeTab === "occupancy" &&
              "Monitor table availability across your restaurant."}
          </p>
        </div>
      </div>

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

      <div className="dashboard-tab-content">
        {activeTab === "overview" && (
          <>
            <div className="stats-grid">
              {stats.map((stat) => (
                <StatCard key={stat.title} {...stat} />
              ))}
            </div>

            <RecentOrders />
          </>
        )}

        {activeTab === "analytics" && (
          <div className="analytics-content">
            <RevenueChart />
            <PopularMenuItems />
          </div>
        )}

        {activeTab === "occupancy" && (
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
