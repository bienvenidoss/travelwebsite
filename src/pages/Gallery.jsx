import React, { useState, useEffect, useRef } from 'react';
import { listDocs } from '@junobuild/core';
import MasonryGallery from '../components/MasonryGallery';
import { useAuth } from '../contexts/AuthContext';
import '../styles/gallery.css';

function Gallery() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isLoading: authLoading } = useAuth();
  const galleryRef = useRef(null);
  const datastoreItems = useRef([]);

  useEffect(() => {
    if (user && !authLoading) {
      loadDatastore();
    }
  }, [user, authLoading]);

  const loadDatastore = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('📚 Fetching entries from datastore');
      const response = await listDocs({
        collection: "travel_entries",
      });

      const allMedia = response.items.reduce((acc, entry) => {
        if (!entry.data.media || !Array.isArray(entry.data.media)) return acc;
        
        const mediaWithMetadata = entry.data.media.map(media => ({
          ...media,
          entryKey: entry.key,
          key: `${entry.key}-${media.fullPath}`,
          ratio: media.width / media.height,
          backgroundColor: media.colors?.[0] ? 
            `rgb(${media.colors[0].r}, ${media.colors[0].g}, ${media.colors[0].b})` : 
            '#f0f0f0'
        }));
        return [...acc, ...mediaWithMetadata];
      }, []);

      console.log(`📊 Processed ${allMedia.length} media items`);
      datastoreItems.current = allMedia;
      setEntries(allMedia);
    } catch (err) {
      console.error('❌ Failed to load entries:', err);
      setError('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gallery-container">
      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div className="loading-container">Loading gallery...</div>
      ) : entries.length === 0 ? (
        <div className="empty-state">No photos yet</div>
      ) : (
        <MasonryGallery 
          ref={galleryRef}
          items={entries}
        />
      )}
    </div>
  );
}

export default Gallery; 