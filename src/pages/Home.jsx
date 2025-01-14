import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Home() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.key === 'rqius-gyaaa-aaaal-arz7a-cai';

  return (
    <div className="container">
      <h1 className="text-3xl font-bold mb-4">Travel Diary</h1>
      
      <div className="auth-section">
        <div className="auth-status mb-4">
          Status: {user ? 'Authenticated' : 'Not Authenticated'}
          {user && (
            <div className="user-info">
              <p>User ID: {user.key.slice(0, 10)}...</p>
              {isAdmin && <p className="admin-badge">Admin User</p>}
            </div>
          )}
        </div>

        {user ? (
          <>
            <p className="welcome-message mb-4">Welcome back!</p>
            <div className="action-buttons">
              <button className="action-button" onClick={() => navigate('/new-entry')}>
                ✍️ New Entry
              </button>
              <button className="action-button" onClick={() => navigate('/map')}>
                🗺️ Map
              </button>
              <button className="action-button" onClick={() => navigate('/gallery')}>
                🖼️ Gallery
              </button>
            </div>
            <button className="auth-button mt-4" onClick={logout}>
              Sign Out
            </button>
          </>
        ) : (
          <button className="auth-button" onClick={login}>
            Sign In with Internet Identity
          </button>
        )}
      </div>
    </div>
  );
}

export default Home; 