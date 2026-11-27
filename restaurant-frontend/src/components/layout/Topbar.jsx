import { useSelector } from "react-redux";
import { Bell, ChevronDown, Menu } from "lucide-react";

function Topbar({ onMenuClick }) {
  const { user, restaurant } = useSelector((state) => state.auth);

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

        <button type="button" className="profile-button">
          <div className="profile-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="profile-info">
            <span className="profile-name">{user?.name || "User"}</span>

            <span className="profile-role">
              {user?.role || "Restaurant User"}
            </span>
          </div>

          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  );
}

export default Topbar;
