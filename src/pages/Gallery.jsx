import React, { useState, useEffect } from 'react';
import { listDocs, deleteDoc, getDoc, setDoc, deleteAsset } from '@junobuild/core';
import MasonryGallery from '../components/MasonryGallery';
import { useAuth } from '../contexts/AuthContext';
import '../styles/gallery.css';
import { useToast } from '../contexts/ToastContext';

function Gallery() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isLoading: authLoading } = useAuth();
  const [deletingItems, setDeletingItems] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState({
    total: 0,
    processed: 0,
    failed: 0
  });
  const { addToast, updateToast, removeToast } = useToast();

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
      
      console.log('📚 Fetching entries from datastore');
      const response = await listDocs({
        collection: "travel_entries",
      });

      // Process all media items with their entry context
      const allMedia = response.items.reduce((acc, entry) => {
        if (!entry.data.media || !Array.isArray(entry.data.media)) return acc;
        
        const mediaWithMetadata = entry.data.media
          .filter(media => !deletingItems.has(media.fullPath))
          .map(media => ({
            ...media,
            entryKey: entry.key,
            key: `${entry.key}-${media.fullPath}`,
            // Pre-calculate aspect ratio and dominant color
            ratio: media.width / media.height,
            backgroundColor: media.colors?.[0] ? 
              `rgb(${media.colors[0].r}, ${media.colors[0].g}, ${media.colors[0].b})` : 
              '#f0f0f0'
          }));
        return [...acc, ...mediaWithMetadata];
      }, []);

      console.log(`📊 Processed ${allMedia.length} media items`);
      setEntries(allMedia);
    } catch (err) {
      console.error('❌ Failed to load entries:', err);
      setError('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemsToDelete) => {
    const toastId = Date.now();
    addToast({
      id: toastId,
      message: `Deleting ${itemsToDelete.length} items...`,
      type: 'info',
      persistent: true,
      progress: 0
    });

    try {
      setIsDeleting(true);
      setDeletionStatus({
        total: itemsToDelete.length,
        processed: 0,
        failed: 0
      });

      // Group items by their entryKey
      const itemsByEntry = itemsToDelete.reduce((acc, item) => {
        if (!acc[item.entryKey]) {
          acc[item.entryKey] = [];
        }
        acc[item.entryKey].push(item);
        return acc;
      }, {});

      console.log('🗂️ Processing entries:', Object.keys(itemsByEntry).length);

      // Process entries in parallel
      await Promise.all(Object.entries(itemsByEntry).map(async ([entryKey, items]) => {
        try {
          const doc = await getDoc({
            collection: "travel_entries",
            key: entryKey
          });

          if (!doc) return;

          // Delete all assets in parallel
          await Promise.all(items.map(item => 
            deleteAsset({
              collection: 'travel_media',
              fullPath: item.fullPath
            }).catch(error => {
              console.error(`Failed to delete asset: ${item.fullPath}`, error);
              setDeletionStatus(prev => ({
                ...prev,
                failed: prev.failed + 1
              }));
            })
          ));

          // Update document once
          const updatedMedia = doc.data.media.filter(
            media => !items.some(item => item.fullPath === media.fullPath)
          );

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

          setDeletionStatus(prev => ({
            ...prev,
            processed: prev.processed + items.length
          }));

        } catch (error) {
          console.error(`❌ Error processing entry ${entryKey}:`, error);
          setDeletionStatus(prev => ({
            ...prev,
            failed: prev.failed + items.length
          }));
        }
      }));

      console.log('✅ Batch deletion completed');
      await loadEntries();

      // Update progress
      updateToast(toastId, {
        progress: (deletionStatus.processed / deletionStatus.total) * 100
      });
      
      // On completion
      updateToast(toastId, {
        message: 'Successfully deleted items',
        type: 'success',
        persistent: false,
        duration: 3000
      });

    } catch (error) {
      console.error('❌ Batch deletion failed:', error);
      setError('Failed to delete selected items');

      updateToast(toastId, {
        message: 'Failed to delete some items',
        type: 'error',
        persistent: false,
        duration: 5000
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="gallery-container">
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