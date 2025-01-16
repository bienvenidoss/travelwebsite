import React, { useState, useEffect, useRef, useCallback } from 'react';
import PackeryGallery from '../components/gallery/PackeryGallery';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useGalleryData } from '../hooks/gallery/useGalleryData';
import { updateEntryWithRetry } from '../services/gallery/deleteService';
import '../styles/gallery.css';

function Gallery() {
  const { user } = useAuth();
  const { addToast, updateToast } = useToast();
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const activeToastRef = useRef(null);
  const { entries, loading, error, loadDatastore } = useGalleryData();

  useEffect(() => {
    if (user) {
      loadDatastore(user);
    }
  }, [user?.key]);

  const handleSelectItem = useCallback((item, startSelection = false) => {
    if (startSelection) {
      setIsSelectionMode(true);
    }
    
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
        // If no items left, exit selection mode
        if (newSet.size === 0) {
          setIsSelectionMode(false);
        }
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  }, []);

  const handleCancelSelection = () => {
    setSelectedItems(new Set());
    setIsSelectionMode(false);
  };

  const deleteSelectedItems = async () => {
    if (selectedItems.size === 0) return;

    const toastId = Date.now();
    activeToastRef.current = toastId;
    
    // Initial toast
    addToast({
      id: toastId,
      message: `Preparing to delete ${selectedItems.size} items...`,
      type: 'info',
      persistent: true,
      progress: 0,
      duration: 0 // No auto-dismiss for the progress toast
    });

    try {
      // Group items by entry
      const itemsByEntry = Array.from(selectedItems).reduce((acc, item) => {
        const entryKey = item.entryKey;
        if (!acc[entryKey]) {
          acc[entryKey] = [];
        }
        acc[entryKey].push(item);
        return acc;
      }, {});

      let successCount = 0;
      // Process each entry
      for (const [entryKey, items] of Object.entries(itemsByEntry)) {
        const result = await updateEntryWithRetry(entryKey, items);
        if (result.success) {
          successCount += result.itemsProcessed || 0;
        } else {
          console.error(`Failed to delete items from entry ${entryKey}`);
        }
      }

      // Success toast with auto-dismiss
      updateToast(toastId, {
        message: `Successfully deleted ${successCount} items`,
        type: 'success',
        persistent: false,
        progress: 100,
        duration: 3000 // Auto-dismiss after 3 seconds
      });

      // Clear selection and reload data
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      loadDatastore(user);

    } catch (error) {
      console.error('Failed to delete items:', error);
      // Error toast with auto-dismiss
      updateToast(toastId, {
        message: 'Failed to delete items',
        type: 'error',
        persistent: false,
        progress: 100,
        duration: 3000 // Auto-dismiss after 3 seconds
      });
    }
  };

  return (
    <>
      <div className="gallery-container">
        {error && <div className="error-message">{error}</div>}
        {loading ? (
          <div className="loading-container">Loading gallery...</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">No photos yet</div>
        ) : (
          <PackeryGallery 
            items={entries}
            selectedItems={selectedItems}
            onSelectItem={handleSelectItem}
            isSelectionMode={isSelectionMode}
          />
        )}
      </div>

      {selectedItems.size > 0 && (
        <div className="deletion-ui">
          <div className="deletion-ui-content">
            <span className="selection-count">
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
            <div className="deletion-actions">
              <button 
                className="cancel-button"
                onClick={handleCancelSelection}
              >
                Cancel
              </button>
              <button 
                className="delete-button"
                onClick={deleteSelectedItems}
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default React.memo(Gallery); 