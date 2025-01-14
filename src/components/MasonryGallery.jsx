import React, { useState, useEffect, useRef } from 'react';
import '../styles/masonryGallery.css';

const MasonryItem = ({ item, columnWidth, onDelete, isSelectable, isSelected, onSelect }) => {
  const [loaded, setLoaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const imageRef = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (item?.type?.startsWith('video/')) {
            setLoaded(true);
          } else {
            const img = new Image();
            img.src = item.downloadUrl;
            img.onload = () => setLoaded(true);
          }
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => observer.disconnect();
  }, [item?.downloadUrl, item?.type]);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
    setShowDeleteButton(true);
  };

  const handleConfirmDelete = (e) => {
    e.stopPropagation();
    onDelete(item);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
    setShowDeleteButton(false);
  };

  const handleItemClick = () => {
    if (isSelectable) {
      onSelect(item);
    }
  };

  const aspectRatio = item?.ratio || 1;
  const itemHeight = columnWidth / aspectRatio;
  const isVideo = item?.type?.startsWith('video/');

  if (!item?.downloadUrl) {
    return null; // Don't render items without downloadUrl
  }

  return (
    <div 
      className={`grid-item ${isSelected ? 'selected' : ''} ${isSelectable ? 'selectable' : ''}`}
      style={{ 
        width: `${columnWidth}px`,
        height: `${itemHeight}px`,
      }}
      ref={imageRef}
      onClick={handleItemClick}
      onMouseEnter={() => setShowDeleteButton(true)}
      onMouseLeave={() => {
        if (!showDeleteConfirm) {
          setShowDeleteButton(false);
        }
      }}
    >
      <div className="grid-item-content">
        {!isSelectable && (showDeleteButton || showDeleteConfirm) && (
          <button 
            className="delete-button"
            onClick={handleDeleteClick}
            aria-label="Delete item"
          >
            ×
          </button>
        )}
        
        {showDeleteConfirm && (
          <div className="delete-confirm">
            <p>Delete this item?</p>
            <div className="delete-actions">
              <button onClick={handleConfirmDelete}>Yes</button>
              <button onClick={handleCancelDelete}>No</button>
            </div>
          </div>
        )}

        {isSelectable && isSelected && (
          <div className="select-indicator">✓</div>
        )}

        {isVideo ? (
          <video
            src={loaded ? item.downloadUrl : ''}
            className="media-content"
            style={{ opacity: loaded ? 1 : 0 }}
            controls
            playsInline
            poster={item.thumbnailUrl}
          />
        ) : (
          <>
            <div 
              className="color-placeholder"
              style={{ 
                backgroundColor: item.colors?.[0] ? 
                  `rgb(${item.colors[0].r}, ${item.colors[0].g}, ${item.colors[0].b})` : 
                  '#f0f0f0',
                opacity: loaded ? 0 : 1
              }}
            />
            <img
              src={loaded ? item.downloadUrl : ''}
              alt={item.originalName || 'Gallery image'}
              className="media-content"
              style={{ opacity: loaded ? 1 : 0 }}
            />
          </>
        )}
      </div>
    </div>
  );
};

const MasonryGallery = ({ items, onDelete }) => {
  const [columns, setColumns] = useState(3);
  const [columnWidth, setColumnWidth] = useState(300);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const containerRef = useRef(null);
  const resizeTimeoutRef = useRef(null);
  const [selectedItems, setSelectedItems] = useState(new Set());

  useEffect(() => {
    const updateLayout = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const minColumnWidth = 250;
      const maxColumns = Math.floor(containerWidth / minColumnWidth);
      const newColumns = Math.max(1, maxColumns);
      const newColumnWidth = Math.floor(containerWidth / newColumns);
      
      setColumns(newColumns);
      setColumnWidth(newColumnWidth);
    };

    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = window.setTimeout(updateLayout, 100);
    };

    updateLayout();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  const handleSelect = (item) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(item.fullPath)) {
        newSelected.delete(item.fullPath);
      } else {
        newSelected.add(item.fullPath);
      }
      return newSelected;
    });
  };

  const handleDeleteSelected = () => {
    const itemsToDelete = items.filter(item => selectedItems.has(item.key));
    if (itemsToDelete.length > 0) {
      console.log('🔍 Sending batch delete:', itemsToDelete.length, 'items');
      onDelete(itemsToDelete);
    }
    
    setSelectedItems(new Set());
  };

  const distributeItems = () => {
    const columnHeights = Array(columns).fill(0);
    const columnItems = Array(columns).fill().map(() => []);

    items.forEach(item => {
      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
      columnItems[shortestColumn].push(item);
      columnHeights[shortestColumn] += columnWidth / (item.ratio || 1);
    });

    return columnItems;
  };

  return (
    <>
      <div className="gallery-actions">
        <button 
          className="select-mode-button"
          onClick={() => {
            setIsSelectMode(!isSelectMode);
            if (!isSelectMode) setSelectedItems(new Set());
          }}
        >
          {isSelectMode ? 'Cancel Selection' : 'Select Items'}
        </button>
        
        {selectedItems.size > 0 && (
          <>
            <button 
              className="edit-selected-button"
              onClick={() => {/* TODO: Implement edit functionality */}}
            >
              Edit Selected ({selectedItems.size})
            </button>
            <button 
              className="delete-selected-button"
              onClick={handleDeleteSelected}
            >
              Delete Selected ({selectedItems.size})
            </button>
          </>
        )}
      </div>

      <div className="grid" ref={containerRef}>
        {distributeItems().map((column, columnIndex) => (
          <div 
            key={columnIndex} 
            className="grid-column"
            style={{ width: `${100 / columns}%` }}
          >
            {column.map((item) => (
              <MasonryItem
                key={item.fullPath}
                item={item}
                columnWidth={columnWidth - 1}
                onDelete={onDelete}
                isSelectable={isSelectMode}
                isSelected={selectedItems.has(item.fullPath)}
                onSelect={handleSelect}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
};

export default MasonryGallery; 