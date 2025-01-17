import React, { useState, useEffect, useRef, useCallback } from 'react';
import PackeryGallery from '../components/gallery/PackeryGallery';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useGalleryData } from '../hooks/gallery/useGalleryData';
import { updateEntryWithRetry } from '../services/gallery/deleteService';
import { 
  STORAGE_COLLECTION, 
  DATASTORE_COLLECTION,
  deleteItems 
} from '../services/gallery/storageService';
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
    
    addToast({
      id: toastId,
      message: `Deleting ${selectedItems.size} items...`,
      type: 'info',
      persistent: true,
      progress: 0
    });

    try {
      await deleteItems(Array.from(selectedItems));

      // Success toast
      updateToast(toastId, {
        message: `Successfully deleted ${selectedItems.size} items`,
        type: 'success',
        persistent: false,
        progress: 100,
        duration: 3000
      });

      // Clear selection and reload data
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      loadDatastore(user);

    } catch (error) {
      console.error('Failed to delete items:', error);
      updateToast(toastId, {
        message: 'Failed to delete items',
        type: 'error',
        persistent: false,
        progress: 100,
        duration: 3000
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