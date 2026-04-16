import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-container container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon" style={{ color: 'var(--accent-primary)' }}>💮</span>
          <span className="brand-text">Mind<span>Mentor</span></span>
        </Link>

        <div className="navbar-links">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                id="nav-dashboard"
              >
                Dashboard
              </Link>
              <Link
                to="/assessment"
                className={`nav-link ${isActive('/assessment') ? 'active' : ''}`}
                id="nav-assessment"
              >
                Take Assessment
              </Link>
              <Link
                to="/screening"
                className={`nav-link ${isActive('/screening') ? 'active' : ''}`}
                id="nav-screening"
              >
                Live Screening
              </Link>
              <Link
                to="/community"
                className={`nav-link ${isActive('/community') ? 'active' : ''}`}
                id="nav-community"
              >
                Community
              </Link>
              <Link
                to="/healthcare"
                className={`nav-link ${isActive('/healthcare') ? 'active' : ''}`}
                id="nav-healthcare"
              >
                Therapists
              </Link>
              <Link
                to="/resources"
                className={`nav-link ${isActive('/resources') ? 'active' : ''}`}
                id="nav-resources"
              >
                Resources
              </Link>
              <div className="nav-user">
                <Link to="/profile" className={`nav-link-profile ${isActive('/profile') ? 'active' : ''}`}>
                  <span className="nav-user-name">👤 {user.name}</span>
                </Link>
                <button onClick={logout} className="btn btn-secondary btn-sm" id="btn-logout">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={`nav-link ${isActive('/login') ? 'active' : ''}`}
                id="nav-login"
              >
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm" id="nav-register">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
