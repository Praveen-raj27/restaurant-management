
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard,
  Users,
  Armchair,
  Tags,
  Utensils,
  FileUp,
  Settings,
  X,
} from 'lucide-react';

const navigation = [
  {
    label: 'OVERVIEW',
    items: [
      {
        name: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      {
        name: 'Employees',
        path: '/employees',
        icon: Users,
        roles: ['OWNER', 'MANAGER'],
      },
      {
        name: 'Tables',
        path: '/tables',
        icon: Armchair,
        roles: ['OWNER', 'MANAGER', 'WAITER'],
      },
    ],
  },
  {
    label: 'MENU MANAGEMENT',
    items: [
      {
        name: 'Categories',
        path: '/menu/categories',
        icon: Tags,
        roles: ['OWNER', 'MANAGER'],
      },
      {
        name: 'Menu Items',
        path: '/menu/items',
        icon: Utensils,
        roles: ['OWNER', 'MANAGER'],
      },
      {
        name: 'Import Menu',
        path: '/menu/import',
        icon: FileUp,
        roles: ['OWNER', 'MANAGER'],
      },
    ],
  },
  {
    label: 'PREFERENCES',
    items: [
      {
        name: 'Settings',
        path: '/settings',
        icon: Settings,
        roles: ['OWNER'],
      },
    ],
  },
];

function Sidebar({ isOpen, onClose }) {
  const role = useSelector((state) => state.auth.membership?.role);

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="brand">
        <div className="brand-icon">R</div>

        <div>
          <h2>Restora</h2>
          <span>Restaurant Management</span>
        </div>

        <button
          className="sidebar-close"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-navigation">
        {navigation.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(role)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div className="nav-section" key={section.label}>
              <p className="nav-section-label">{section.label}</p>

              {visibleItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end
                    onClick={onClose}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span>RESTORA</span>
        <span>Version 1.0.0</span>
      </div>
    </aside>
  );
}

export default Sidebar;
