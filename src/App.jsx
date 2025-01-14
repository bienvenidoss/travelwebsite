import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initJuno } from '@junobuild/core';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import NewEntry from './pages/NewEntry';
import Map from './pages/Map';
import Gallery from './pages/Gallery';
import './styles/app.css';

function App() {
  useEffect(() => {
    initJuno({
      satelliteId: 'rqius-gyaaa-aaaal-arz7a-cai'
    });
  }, []);

  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}

export default App; 