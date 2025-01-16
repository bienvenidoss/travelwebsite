import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initSatellite } from '@junobuild/core';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { PackeryProvider } from './contexts/PackeryContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import NewEntry from './pages/NewEntry';
import Map from './pages/Map';
import Gallery from './pages/Gallery';
import './styles/app.css';

function App() {
  useEffect(() => {
    initSatellite({
      satelliteId: 'rqius-gyaaa-aaaal-arz7a-cai'
    });
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <PackeryProvider>
          <BrowserRouter>
            <div className="app">
              <Navbar />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/new-entry" element={<NewEntry />} />
                  <Route path="/map" element={<Map />} />
                  <Route path="/gallery" element={<Gallery />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </PackeryProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App; 