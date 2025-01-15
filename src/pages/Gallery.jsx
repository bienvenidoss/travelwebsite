import React, { useState, useEffect, useRef } from 'react';
import { listDocs, setDoc, deleteDoc } from '@junobuild/core';
import MasonryGallery from '../components/MasonryGallery';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import '../styles/gallery.css';

function Gallery() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const galleryRef = useRef(null);
  const datastoreItems = useRef([]);
  const { addToast, updateToast, removeToast } = useToast();
  const [selectedItems, setSelectedItems] = useState(new Set());
  const activeToastRef = useRef(null);

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

  useEffect(() => {
    if (user) {
      loadDatastore();
    }
  }, [user]);

  const updateEntryWithRetry = async (entryKey, itemsToDelete, maxRetries = 3) => {
    let lastVersion = null;
    let datastoreVersions = new Map(); // Track versions for each datastore
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Get fresh versions of all affected datastores
        const response = await listDocs({
          collection: "travel_entries",
          filter: { key: entryKey }
        });

        if (!response.items.length) {
          console.error('🚫 Entry not found:', entryKey);
          return { success: false, error: 'Entry not found' };
        }

        const currentEntry = response.items[0];
        const currentVersion = currentEntry.version;
        
        // Track datastore version
        const currentStoreVersion = datastoreVersions.get(entryKey);
        if (currentStoreVersion && currentStoreVersion === currentVersion) {
          console.warn('⚠️ Version conflict for datastore:', entryKey);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          continue;
        }
        
        datastoreVersions.set(entryKey, currentVersion);

        console.log('📝 Processing datastore:', {
          key: entryKey,
          version: currentVersion.toString(),
          attempt: attempt + 1,
          itemCount: currentEntry.data.media?.length || 0
        });

        // Filter items to delete for this specific datastore
        const datastoreItemsToDelete = itemsToDelete.filter(item => 
          item.entryKey === entryKey
        );

        const updatedMedia = (currentEntry.data.media || []).filter(mediaItem => 
          !datastoreItemsToDelete.some(item => item.fullPath === mediaItem.fullPath)
        );

        console.log('📊 Update check for datastore:', {
          key: entryKey,
          originalCount: currentEntry.data.media?.length,
          remainingCount: updatedMedia.length,
          toRemove: datastoreItemsToDelete.length
        });

        // Skip if no changes for this datastore
        if (updatedMedia.length === currentEntry.data.media?.length) {
          console.log('ℹ️ No changes needed for datastore:', entryKey);
          return { success: true, unchanged: true };
        }

        const updatePayload = {
          collection: "travel_entries",
          doc: {
            key: entryKey,
            data: {
              ...currentEntry.data,
              media: updatedMedia
            },
            version: currentVersion
          }
        };

        if (updatedMedia.length === 0) {
          console.log('🗑️ Deleting empty datastore:', entryKey);
          await deleteDoc({
            collection: "travel_entries",
            doc: {
              key: entryKey,
              version: currentVersion
            }
          });
        } else {
          console.log('📝 Updating datastore:', entryKey);
          await setDoc(updatePayload);
        }

        return { 
          success: true, 
          itemsProcessed: datastoreItemsToDelete.length 
        };

      } catch (err) {
        const isVersionError = err.message?.includes('error_version_outdated_or_future');
        console.error(`❌ Attempt ${attempt + 1} failed for datastore ${entryKey}:`, {
          error: err,
          isVersionError,
          datastoreVersions: Array.from(datastoreVersions.entries())
        });

        if (isVersionError) {
          // Clear tracked version on version error
          datastoreVersions.delete(entryKey);
          await new Promise(resolve => 
            setTimeout(resolve, 1000 * Math.pow(2, attempt))
          );
          continue;
        }

        if (attempt === maxRetries - 1) {
          return { success: false, error: err.message };
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return { success: false, error: 'Max retries exceeded' };
  };

  const handleDelete = async (item) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  };

  const deleteSelectedItems = async () => {
    if (selectedItems.size === 0) return;

    const toastId = Date.now();
    activeToastRef.current = toastId;
    
    addToast({
      id: toastId,
      message: `Preparing to delete ${selectedItems.size} items...`,
      type: 'info',
      persistent: true,
      progress: 0
    });

    try {
      // Group items by datastore
      const itemsByEntry = Array.from(selectedItems).reduce((acc, item) => {
        if (!acc[item.entryKey]) {
          acc[item.entryKey] = [];
        }
        acc[item.entryKey].push(item);
        return acc;
      }, {});

      console.log('📦 Processing datastores:', Object.keys(itemsByEntry).length);

      let processedItems = 0;
      let failedItems = 0;
      const totalItems = selectedItems.size;

      // Process each datastore sequentially
      for (const [entryKey, items] of Object.entries(itemsByEntry)) {
        const result = await updateEntryWithRetry(entryKey, items);
        
        if (result.success) {
          if (!result.unchanged) {
            processedItems += result.itemsProcessed || 0;
            updateToast(toastId, {
              message: `Deleting items... (${processedItems}/${totalItems})`,
              progress: Math.round((processedItems / totalItems) * 100)
            });
          }
        } else {
          console.error(`Failed to process datastore ${entryKey}:`, result.error);
          failedItems += items.length;
        }
      }

      // Refresh all datastores
      await loadDatastore();
      
      // Show final status
      const message = failedItems > 0 
        ? `Deleted ${processedItems} items, ${failedItems} failed`
        : `Successfully deleted ${processedItems} items`;

      updateToast(toastId, {
        message,
        type: failedItems > 0 ? 'warning' : 'success',
        persistent: false,
        progress: 100,
        duration: 3000
      });

      setSelectedItems(new Set());

    } catch (err) {
      console.error('❌ Delete operation failed:', err);
      updateToast(toastId, {
        message: `Operation failed: ${err.message}`,
        type: 'error',
        persistent: false,
        duration: 3000
      });
    }
  };

  return (
    <div className="gallery-container">
      {selectedItems.size > 0 && (
        <div className="delete-bar">
          <button onClick={deleteSelectedItems}>
            Delete {selectedItems.size} items
          </button>
          <button onClick={() => setSelectedItems(new Set())}>
            Cancel
          </button>
        </div>
      )}
      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div className="loading-container">Loading gallery...</div>
      ) : entries.length === 0 ? (
        <div className="empty-state">No photos yet</div>
      ) : (
        <MasonryGallery 
          items={entries}
          onDelete={handleDelete}
          selectedItems={selectedItems}
        />
      )}
    </div>
  );
}

export default Gallery; 