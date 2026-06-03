import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, RefreshCw, CreditCard,
  BarChart3, Settings, LogOut, Crown, Moon, Sun
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/recurring', icon: RefreshCw, label: 'Recurring' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Crown size={28} className="brand-icon" />
        <span className="brand-text">InvoiceQueen</span>
      </div>
      <nav className="sidebar-nav">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button onClick={toggleTheme} className="nav-link" title="Toggle theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
        <button onClick={signOut} className="nav-link logout-btn">
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
