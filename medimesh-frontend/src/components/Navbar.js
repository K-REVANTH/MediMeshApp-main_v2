import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();
  const token = localStorage.getItem('token');

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to={token ? '/dashboard' : '/'} className="navbar-brand">
        <span className="logo-icon">🏥</span>
        MediMesh
      </Link>
      <div className="navbar-links">
        {token && user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/forum">Forum</Link>
            <span className="nav-user-badge">
              {user.fullName || user.username}
              <span className="nav-role-badge">{user.role}</span>
            </span>
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
