import React, { useState, useEffect } from 'react';
import { listDocs, deleteAsset, setDoc, getDoc } from '@junobuild/core';
import { useAuth } from '../contexts/AuthContext';

function Map() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    console.log('Auth state changed:', { user, authLoading });
    
    if (user && !authLoading) {
      loadEntries();
    }
  }, [user, authLoading]);

  const loadEntries = async () => {
    try {
      console.log('Starting to load entries...');
      setLoading(true);
      setError(null);

      const response = await listDocs({
        collection: "travel_entries",
        filter: {
          order: {
            desc: true,
            field: "created_at"
          }
        }
      });

      // Transform entries to include version as BigInt
      const entriesWithVersion = response.items.map(entry => ({
        ...entry,
        version: 1n  // Set default version as BigInt
      }));

      const firstEntry = entriesWithVersion[0];
      console.log('Entry with version:', {
        key: firstEntry.key,
        owner: firstEntry.owner,
        description: firstEntry.description,
        created_at: firstEntry.created_at?.toString(),
        updated_at: firstEntry.updated_at?.toString(),
        version: firstEntry.version?.toString(),
        data: firstEntry.data
      });

      setEntries(entriesWithVersion);
    } catch (error) {
      console.error('Error loading entries:', error);
      setError('Failed to load entries. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div>Checking authentication...</div>;
  }

  if (!user) {
    return <div>Please sign in to view the map data</div>;
  }

  return (
    <div className="map-debug-container" style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', background: '#f0f0f0', padding: '10px' }}>
        <h3>Debug Info:</h3>
        <p>Loading: {loading.toString()}</p>
        <p>Auth Loading: {authLoading.toString()}</p>
        <p>Error: {error || 'none'}</p>
        <p>Number of entries: {entries.length}</p>
        <p>User authenticated: {user ? 'yes' : 'no'}</p>
        <p>User key: {user?.key}</p>
      </div>

      <h2>Travel Entries Debug Data</h2>
      
      {entries.map((entry, index) => (
        <div key={entry.key} style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          border: '1px solid #ccc', 
          borderRadius: '5px' 
        }}>
          <h3>Entry {index + 1}: {entry.key}</h3>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px',
            overflow: 'auto'
          }}>
            {JSON.stringify({
              // Document metadata
              key: entry.key,
              owner: entry.owner,
              description: entry.description,
              created_at: entry.created_at?.toString(),
              updated_at: entry.updated_at?.toString(),
              version: entry.version?.toString(),
              
              // Document data
              data: {
                title: entry.data.title,
                description: entry.data.description,
                location: entry.data.location,
                date: entry.data.date,
                tags: entry.data.tags,
                media: entry.data.media?.map(media => ({
                  downloadUrl: media.downloadUrl,
                  fullPath: media.fullPath,
                  type: media.type,
                  originalName: media.originalName,
                  size: media.size,
                  width: media.width,
                  height: media.height,
                  ratio: media.ratio,
                  colors: media.colors
                }))
              }
            }, (key, value) => {
              // Handle BigInt serialization
              if (typeof value === 'bigint') {
                return value.toString();
              }
              return value;
            }, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

export default Map; 