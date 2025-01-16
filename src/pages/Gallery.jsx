import React, { useState, useEffect, useRef, useCallback } from 'react';
import PackeryGallery from '../components/gallery/PackeryGallery';
import DeleteBar from '../components/gallery/DeleteBar';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useGalleryData } from '../hooks/gallery/useGalleryData';
import { updateEntryWithRetry } from '../services/gallery/deleteService';
import '../styles/gallery.css';

function Gallery() {
  const { user } = useAuth();
  const { addToast, updateToast } = useToast();
  const [selectedItems, setSelectedItems] = useState(new Set());
  const activeToastRef = useRef(null);
  const { entries, loading, error, loadDatastore } = useGalleryData();

  useEffect(() => {
    if (user) {
      loadDatastore(user);
    }
  }, [user?.key]);

  const handleDelete = useCallback((item) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  }, []);

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
      const itemsByEntry = Array.from(selectedItems).reduce((acc, item) => {
        if (!acc[item.entryKey]) {
          acc[item.entryKey] = [];
        }
        acc[item.entryKey].push(item);
        return acc;
      }, {});

      let processedItems = 0;
      let failedItems = 0;
      const totalItems = selectedItems.size;

      for (const [entryKey, items] of Object.entries(itemsByEntry)) {
        const result = await updateEntryWithRetry(entryKey, items);
        
        if (result.success && !result.unchanged) {
          processedItems += result.itemsProcessed || 0;
          updateToast(toastId, {
            message: `Deleting items... (${processedItems}/${totalItems})`,
            progress: Math.round((processedItems / totalItems) * 100)
          });
        } else if (!result.success) {
          failedItems += items.length;
        }
      }

      await loadDatastore();
      
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
        <DeleteBar
          itemCount={selectedItems.size}
          onDelete={deleteSelectedItems}
          onCancel={() => setSelectedItems(new Set())}
        />
      )}
      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div className="loading-container">Loading gallery...</div>
      ) : entries.length === 0 ? (
        <div className="empty-state">No photos yet</div>
      ) : (
        <PackeryGallery 
          items={entries}
          onDelete={handleDelete}
          selectedItems={selectedItems}
        />
      )}
    </div>
  );
}

export default React.memo(Gallery); 