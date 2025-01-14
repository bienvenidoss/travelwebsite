import React, { useState, useEffect } from 'react';
import { listDocs, deleteDoc, getDoc, setDoc, deleteAsset } from '@junobuild/core';
import MasonryGallery from '../components/MasonryGallery';
import { useAuth } from '../contexts/AuthContext';
import '../styles/gallery.css';

function Gallery() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isLoading: authLoading } = useAuth();
  const [deletingItems, setDeletingItems] = useState(new Set());

  useEffect(() => {
    if (user && !authLoading) {
      loadEntries();
    }
  }, [user, authLoading]);

  const loadEntries = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await listDocs({
        collection: "travel_entries",
      });

      const allMedia = response.items.reduce((acc, entry) => {
        if (!entry.data.media || !Array.isArray(entry.data.media)) return acc;
        const mediaWithKeys = entry.data.media
          .filter(media => !deletingItems.has(media.fullPath))
          .map(media => ({
            ...media,
            entryKey: entry.key,
            key: `${entry.key}-${media.fullPath}`
          }));
        return [...acc, ...mediaWithKeys];
      }, []);

      setEntries(allMedia);
    } catch (err) {
      setError('Failed to load gallery items');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (mediaToDeleteList) => {
    console.log('🔍 Received items for deletion:', mediaToDeleteList);

    // Group items by their entryKey (datastore)
    const itemsByDatastore = mediaToDeleteList.reduce((acc, item) => {
      const entryKey = item.entryKey;
      if (!acc[entryKey]) {
        acc[entryKey] = [];
      }
      acc[entryKey].push(item);
      return acc;
    }, {});

    console.log('📑 Grouped by datastore:', itemsByDatastore);

    try {
      // Mark all items as being deleted in UI
      const allPaths = mediaToDeleteList.map(item => item.fullPath);
      setDeletingItems(prev => new Set([...prev, ...allPaths]));

      // Handle each datastore's items separately
      for (const [entryKey, items] of Object.entries(itemsByDatastore)) {
        console.log(`🗂️ Processing datastore ${entryKey} with ${items.length} items`);
        
        // 1. Get document for this datastore
        const doc = await getDoc({
          collection: "travel_entries",
          key: entryKey
        });

        if (!doc) {
          console.error('❌ Document not found:', entryKey);
          continue; // Skip this datastore but continue with others
        }

        console.log(`📦 Got document for ${entryKey}, version:`, doc.version);

        // 2. Delete assets for this datastore
        const itemPaths = items.map(item => item.fullPath);
        const deleteResults = await Promise.allSettled(
          items.map(item => 
            deleteAsset({
              collection: 'travel_media',
              fullPath: item.fullPath
            })
            .then(() => {
              console.log('✅ File deleted successfully:', item.fullPath);
              return { fullPath: item.fullPath, success: true };
            })
            .catch((err) => {
              console.error('❌ File deletion failed:', item.fullPath, err);
              return { fullPath: item.fullPath, success: false };
            })
          )
        );

        const successfulDeletes = deleteResults
          .filter(result => result.value?.success)
          .map(result => result.value.fullPath);

        console.log(`📊 Datastore ${entryKey} deletion results: ${successfulDeletes.length}/${items.length} files deleted`);

        if (successfulDeletes.length === 0) {
          console.warn(`⚠️ No files were deleted successfully for datastore ${entryKey}`);
          continue; // Skip datastore update but continue with others
        }

        // 3. Update this datastore's document
        const pathsToDelete = new Set(successfulDeletes);
        let updatedMedia = doc.data.media.filter(
          media => !pathsToDelete.has(media.fullPath)
        );

        console.log(`📝 Updating datastore ${entryKey} with ${updatedMedia.length} remaining items`);

        // 4. Update Juno with retries for this datastore
        let retries = 3;
        while (retries > 0) {
          try {
            await setDoc({
              collection: "travel_entries",
              doc: {
                key: entryKey,
                version: doc.version,
                data: {
                  ...doc.data,
                  media: updatedMedia
                }
              }
            });
            
            console.log(`✅ Datastore ${entryKey} updated successfully`);
            break;
          } catch (err) {
            console.error(`❌ Update failed for ${entryKey} (attempt ${4-retries}/3):`, err.message);
            retries--;
            
            if (retries === 0) throw err;
            
            if (err.message?.includes('error_version_outdated_or_future')) {
              const freshDoc = await getDoc({
                collection: "travel_entries",
                key: entryKey
              });
              
              if (freshDoc) {
                console.log(`📄 Version updated for ${entryKey}: ${doc.version} -> ${freshDoc.version}`);
                doc.version = freshDoc.version;
                updatedMedia = freshDoc.data.media.filter(
                  media => !pathsToDelete.has(media.fullPath)
                );
              }
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      await loadEntries();
      console.log('✅ All datastores processed successfully');

    } catch (err) {
      console.error('❌ Operation failed:', err);
      setError('Failed to update datastores');
    } finally {
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        allPaths.forEach(path => newSet.delete(path));
        return newSet;
      });
    }
  };

  if (authLoading) {
    return <div className="loading-container">Loading...</div>;
  }

  if (!user) {
    return <div className="container">Please sign in to view the gallery</div>;
  }

  return (
    <div className="gallery-container" style={{ 
      height: '100vh', 
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <h2>Travel Gallery</h2>
      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div className="loading-container">Loading gallery...</div>
      ) : entries.length === 0 ? (
        <div className="empty-state">No photos yet</div>
      ) : (
        <div style={{ minHeight: 0, flex: 1 }}>
          <MasonryGallery 
            items={entries} 
            onDelete={handleDelete}
          />
        </div>
      )}
    </div>
  );
}

export default Gallery; 