import { useState, useEffect, useRef } from 'react';
import { listDocs } from '@junobuild/core';

export function useGalleryData() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isLoadingRef = useRef(false);
  const lastUserRef = useRef(null);

  const loadDatastore = async (user) => {
    // Prevent duplicate loads for same user
    if (isLoadingRef.current || user?.key === lastUserRef.current) {
      console.log('🔄 Skipping duplicate datastore fetch');
      return;
    }

    console.log('📚 Starting datastore fetch');
    isLoadingRef.current = true;
    
    try {
      setLoading(true);
      
      const response = await listDocs({
        collection: "travel_entries",
      });
      console.log(`📦 Received ${response.items.length} entries from Juno`);

      const allMedia = response.items.reduce((acc, entry) => {
        if (!entry.data.media || !Array.isArray(entry.data.media)) {
          console.log(`⚠️ Entry ${entry.key} has no media or invalid media`);
          return acc;
        }
        
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

      console.log(`📊 Processed ${allMedia.length} total media items`);
      setEntries(allMedia);
      lastUserRef.current = user?.key;

    } catch (err) {
      console.error('❌ Failed to load entries:', err);
      setError('Failed to load gallery');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  return {
    entries,
    loading,
    error,
    loadDatastore
  };
} 