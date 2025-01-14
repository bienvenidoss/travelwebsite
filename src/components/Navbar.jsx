import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/navbar.css';

function Navbar() {
  const { user, login, logout, isLoading } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">Travel Diary</Link>
      </div>
      <div className="nav-links">
        <Link to="/" className={isActive('/') ? 'active' : ''}>
          Home
        </Link>
        {user && (
          <>
            <Link to="/new-entry" className={isActive('/new-entry') ? 'active' : ''}>
              New Entry
            </Link>
            <Link to="/map" className={isActive('/map') ? 'active' : ''}>
              Map
            </Link>
            <Link to="/gallery" className={isActive('/gallery') ? 'active' : ''}>
              Gallery
            </Link>
          </>
        )}
      </div>
      <div className="nav-auth">
        {isLoading ? (
          <span>Loading...</span>
        ) : user ? (
          <button onClick={logout} className="auth-button">Sign Out</button>
        ) : (
          <button onClick={login} className="auth-button">Sign In</button>
        )}
      </div>
    </nav>
  );
}

export default Navbar; 