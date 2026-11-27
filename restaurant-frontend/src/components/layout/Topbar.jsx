
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  Menu,
  UserRound,
  LogOut,
  LoaderCircle,
} from "lucide-react";

import { clearCredentials } from "../../features/auth/authSlice";
import authService from "../../features/auth/authService";

function Topbar({ onMenuClick }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, restaurant, membership } = useSelector(
    (state) => state.auth
  );

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const profileRef = useRef(null);

  const roleName = membership?.role?.name || "Restaurant User";

  const formattedRole = roleName
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  // Close dropdown when clicking outside or pressing Escape.
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutError("");

    try {
      await authService.logout();

      dispatch(clearCredentials());

      setIsDropdownOpen(false);

      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);

      setLogoutError(
        error.response?.data?.message ||
          "Unable to logout. Please try again."
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="mobile-menu-button"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>

        <span className="topbar-restaurant">
          {restaurant?.name || "Restaurant Workspace"}
        </span>
      </div>

      <div className="topbar-right">
        <button
          type="button"
          className="notification-button"
          aria-label="Notifications"
        >
          <Bell size={19} />
        </button>

        <div className="topbar-divider" />

        <div className="profile-menu-wrapper" ref={profileRef}>
          <button
            type="button"
            className={`profile-button ${
              isDropdownOpen ? "profile-button-active" : ""
            }`}
            onClick={() => {
              setIsDropdownOpen((previous) => !previous);
              setLogoutError("");
            }}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            aria-label="Open user menu"
          >
            <div className="profile-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div className="profile-info">
              <span className="profile-name">
                {user?.name || "User"}
              </span>

              <span className="profile-role">
                {formattedRole}
              </span>
            </div>

            <ChevronDown
              size={16}
              className={`profile-chevron ${
                isDropdownOpen ? "profile-chevron-open" : ""
              }`}
            />
          </button>

          {isDropdownOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <div className="profile-dropdown-avatar">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>

                <div className="profile-dropdown-details">
                  <strong>{user?.name || "User"}</strong>

                  <span>{user?.email || ""}</span>

                  <small>{formattedRole}</small>
                </div>
              </div>

              <div className="profile-dropdown-divider" />

              <div className="profile-dropdown-restaurant">
                <span>Restaurant</span>
                <strong>
                  {restaurant?.name || "Restaurant Workspace"}
                </strong>
              </div>

              {logoutError && (
                <div className="logout-error" role="alert">
                  {logoutError}
                </div>
              )}

              <div className="profile-dropdown-divider" />

              <button
                type="button"
                className="profile-logout-button"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <LoaderCircle size={17} className="logout-spinner" />
                    <span>Logging out...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={17} />
                    <span>Logout</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
