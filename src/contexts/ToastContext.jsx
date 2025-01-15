import React, { createContext, useContext, useState } from 'react';
import '../styles/toast.css';

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now();
    setToasts(current => [...current, { ...toast, id }]);
    if (!toast.persistent) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }
  };

  const updateToast = (id, updates) => {
    setToasts(current =>
      current.map(toast =>
        toast.id === id ? { ...toast, ...updates } : toast
      )
    );
  };

  const removeToast = (id) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, updateToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`toast ${toast.type || 'info'}`}
          >
            <div className="toast-content">
              <div className="toast-message">{toast.message}</div>
              {toast.progress !== undefined && (
                <div className="toast-progress-container">
                  <div 
                    className="toast-progress-bar"
                    style={{ width: `${toast.progress}%` }}
                  />
                  <span className="toast-progress-text">
                    {toast.progress}%
                  </span>
                </div>
              )}
            </div>
            {!toast.persistent && (
              <button 
                className="toast-close"
                onClick={() => removeToast(toast.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
} 