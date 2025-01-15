import React, { createContext, useContext, useState, useCallback } from 'react';
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

  const removeToast = useCallback((id) => {
    console.log('🗑️ Removing toast:', id);
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    const id = toast.id || Date.now();
    console.log('➕ Adding toast:', { id, ...toast });
    
    // Add fade-in class
    setToasts(current => [...current, { 
      ...toast, 
      id,
      className: 'toast-fade-in'
    }]);

    // Auto-remove non-persistent toasts
    if (!toast.persistent) {
      const duration = toast.duration || 3000;
      setTimeout(() => {
        // Add fade-out class before removing
        setToasts(current =>
          current.map(t =>
            t.id === id ? { ...t, className: 'toast-fade-out' } : t
          )
        );
        
        // Remove after animation
        setTimeout(() => removeToast(id), 300);
      }, duration);
    }
  }, [removeToast]);

  const updateToast = useCallback((id, updates) => {
    console.log('🔄 Updating toast:', { id, ...updates });
    
    setToasts(current =>
      current.map(toast => {
        if (toast.id === id) {
          const updatedToast = { ...toast, ...updates };
          
          // Handle auto-removal for non-persistent updates
          if (!updatedToast.persistent && updates.duration) {
            setTimeout(() => {
              setToasts(current =>
                current.map(t =>
                  t.id === id ? { ...t, className: 'toast-fade-out' } : t
                )
              );
              setTimeout(() => removeToast(id), 300);
            }, updates.duration);
          }
          
          return updatedToast;
        }
        return toast;
      })
    );
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, updateToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`toast ${toast.type || 'info'} ${toast.className || ''}`}
          >
            <div className="toast-content">
              <div className="toast-message">{toast.message}</div>
              {toast.progress !== undefined && (
                <div className="toast-progress-container">
                  <div 
                    className="toast-progress-bar"
                    style={{ 
                      width: `${toast.progress}%`,
                      transition: 'width 0.3s ease-in-out'
                    }}
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
                onClick={() => {
                  setToasts(current =>
                    current.map(t =>
                      t.id === toast.id ? { ...t, className: 'toast-fade-out' } : t
                    )
                  );
                  setTimeout(() => removeToast(toast.id), 300);
                }}
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