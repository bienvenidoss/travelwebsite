import React, { createContext, useContext, useState, useEffect } from 'react';
import { signIn, signOut, authSubscribe } from '@junobuild/core';

const AuthContext = createContext(null);

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('Setting up auth subscription');
    const subscription = authSubscribe((status) => {
      console.log('Auth status changed:', status);
      if (status && status.key) {
        // User is authenticated
        setUser({
          key: status.key,
          identity: status.identity,
          data: status.data || {}
        });
      } else {
        // User is not authenticated
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      console.log('Cleaning up auth subscription');
      subscription();
    };
  }, []);

  const login = async () => {
    try {
      console.log('Attempting to sign in');
      await signIn();
      console.log('Sign in initiated');
    } catch (error) {
      console.error('Sign in failed:', error);
      setUser(null);
    }
  };

  const logout = async () => {
    try {
      console.log('Attempting to sign out');
      await signOut();
      setUser(null);
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  console.log('Current auth state:', { user, isLoading });

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export { useAuth }; 