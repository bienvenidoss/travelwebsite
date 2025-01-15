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
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const entry = await listDocs({
          collection: "travel_entries",
          filter: { key: entryKey }
        });

        if (!entry.items.length) {
          throw new Error('Entry not found');
        }

        const currentEntry = entry.items[0];
        const currentMedia = currentEntry.data.media || [];

        console.log('📝 Current document state:', {
          key: entryKey,
          mediaCount: currentMedia.length,
          itemsToRemove: itemsToDelete.length
        });

        const updatedMedia = currentMedia.filter(media => 
          !itemsToDelete.some(item => item.fullPath === media.fullPath)
        );

        console.log('📊 Update check:', {
          originalCount: currentMedia.length,
          remainingCount: updatedMedia.length,
          removedCount: currentMedia.length - updatedMedia.length
        });

        if (updatedMedia.length === 0) {
          // If no media items remain, delete the entire document
          console.log('🗑️ Deleting document as no media items remain');
          await deleteDoc({
            collection: "travel_entries",
            doc: {
              key: entryKey,
              version: currentEntry.version
            }
          });
        } else {
          // Otherwise, update the document with the remaining media items
          console.log('📝 Updating document with remaining media items');
          await setDoc({
            collection: "travel_entries",
            doc: {
              key: entryKey,
              data: {
                ...currentEntry.data,
                media: updatedMedia
              },
              version: currentEntry.version
            }
          });
        }

        return true;
      } catch (err) {
        console.error(`❌ Attempt ${attempt + 1} failed:`, err);
        if (attempt === maxRetries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return false;
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

    // First remove any existing toast
    if (activeToastRef.current) {
      removeToast(activeToastRef.current);
    }

    const toastId = Date.now();
    activeToastRef.current = toastId;
    
    console.log('🗑️ Starting deletion process for', selectedItems.size, 'items');
    
    addToast({
      id: toastId,
      message: `Deleting ${selectedItems.size} items...`,
      type: 'info',
      persistent: true,
      progress: 0
    });

    try {
      const itemsByEntry = Array.from(selectedItems).reduce((acc, item) => {
        if (!acc[item.entryKey]) {
          acc[item.entryKey] = [];
        }
        acc[item.entryKey].push(item);
        return acc;
      }, {});

      let processedItems = 0;
      const totalItems = selectedItems.size;

      for (const [entryKey, items] of Object.entries(itemsByEntry)) {
        const success = await updateEntryWithRetry(entryKey, items);
        if (success) {
          processedItems += items.length;
          
          // Update progress toast
          if (activeToastRef.current === toastId) {
            updateToast(toastId, {
              message: `Deleting items... (${processedItems}/${totalItems})`,
              type: 'info',
              persistent: true,
              progress: Math.round((processedItems / totalItems) * 100)
            });
          }
        }
      }

      // Update local state
      setEntries(current => 
        current.filter(item => !selectedItems.has(item))
      );
      
      // Refresh the datastore
      await loadDatastore();

      // Show final success toast and remove after delay
      if (activeToastRef.current === toastId) {
        updateToast(toastId, {
          message: `Successfully deleted ${processedItems} items`,
          type: 'success',
          persistent: false,
          progress: 100,
          duration: 3000
        });

        // Remove toast after duration
        setTimeout(() => {
          if (activeToastRef.current === toastId) {
            removeToast(toastId);
            activeToastRef.current = null;
          }
        }, 3000);
      }

      // Clear selection
      setSelectedItems(new Set());
      
    } catch (err) {
      console.error('❌ Failed to delete items:', err);
      if (activeToastRef.current === toastId) {
        updateToast(toastId, {
          message: `Failed to delete items: ${err.message}`,
          type: 'error',
          persistent: false,
          duration: 3000
        });

        // Remove error toast after duration
        setTimeout(() => {
          if (activeToastRef.current === toastId) {
            removeToast(toastId);
            activeToastRef.current = null;
          }
        }, 3000);
      }
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