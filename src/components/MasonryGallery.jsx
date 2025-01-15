import React, { useState, useEffect, useRef } from 'react';
import '../styles/masonryGallery.css';

function MasonryGallery({ items, onDelete }) {
  const [columns, setColumns] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    console.log('🎨 MasonryGallery mounted with', items.length, 'items');
    calculateLayout();
    
    const handleResize = () => {
      console.log('📏 Window resized, recalculating layout');
      calculateLayout();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [items]);

  const calculateLayout = () => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const minColumnWidth = 300;
    const maxColumns = 4;
    
    // Calculate number of columns based on container width
    const columnCount = Math.min(
      maxColumns,
      Math.max(1, Math.floor(containerWidth / minColumnWidth))
    );
    
    console.log('📏 Container width:', containerWidth, 'Columns:', columnCount);
    
    // Initialize columns
    const newColumns = Array(columnCount).fill().map(() => []);
    
    // Distribute items to achieve balanced column heights
    items.forEach((item) => {
      const shortestColumn = newColumns.reduce((minCol, col, i) => {
        const currentHeight = col.reduce((sum, item) => sum + (1 / item.ratio), 0);
        const minHeight = newColumns[minCol].reduce((sum, item) => sum + (1 / item.ratio), 0);
        return currentHeight < minHeight ? i : minCol;
      }, 0);
      
      newColumns[shortestColumn].push(item);
    });

    setColumns(newColumns);
  };

  const toggleSelectMode = () => {
    console.log('🔄 Toggling select mode:', !isSelectMode);
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) {
      setSelectedItems(new Set());
    }
  };

  const toggleItemSelection = (item) => {
    if (!isSelectMode) return;
    
    console.log('🎯 Toggling selection for item:', item.key);
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item.key)) {
        newSet.delete(item.key);
        console.log('❌ Removed item from selection:', item.key);
      } else {
        newSet.add(item.key);
        console.log('✅ Added item to selection:', item.key);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = () => {
    console.log('🗑️ Delete button clicked');
    const itemsToDelete = Array.from(selectedItems).map(key => 
      items.find(item => item.key === key)
    ).filter(Boolean);
    
    console.log('📦 Items prepared for deletion:', itemsToDelete);
    
    if (itemsToDelete.length === 0) {
      console.warn('⚠️ No items selected for deletion');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${itemsToDelete.length} items?`)) {
      console.log('✅ User confirmed deletion');
      onDelete(itemsToDelete);
      setSelectedItems(new Set());
      setIsSelectMode(false);
    } else {
      console.log('❌ User cancelled deletion');
    }
  };

  return (
    <div className="masonry-container">
      <div className="gallery-actions">
        <button 
          className="select-mode-button"
          onClick={toggleSelectMode}
        >
          {isSelectMode ? 'Cancel Selection' : 'Select Items'}
        </button>
        
        {isSelectMode && selectedItems.size > 0 && (
          <button 
            className="delete-selected-button"
            onClick={handleDeleteSelected}
          >
            Delete Selected ({selectedItems.size})
          </button>
        )}
      </div>

      <div className="grid" ref={containerRef}>
        {columns.map((column, columnIndex) => (
          <div 
            key={columnIndex}
            className="grid-column"
          >
            {column.map(item => (
              <div
                key={item.key}
                className={`grid-item ${isSelectMode ? 'selectable' : ''} ${
                  selectedItems.has(item.key) ? 'selected' : ''
                }`}
                onClick={() => toggleItemSelection(item)}
                style={{
                  backgroundColor: item.backgroundColor,
                  aspectRatio: item.ratio
                }}
              >
                <div className="grid-item-content">
                  {item.type?.startsWith('image/') ? (
                    <img
                      src={item.downloadUrl}
                      alt=""
                      className="media-content"
                      loading="lazy"
                      onLoad={(e) => {
                        e.target.style.opacity = 1;
                      }}
                      style={{ opacity: 0 }}
                    />
                  ) : item.type?.startsWith('video/') ? (
                    <video
                      src={item.downloadUrl}
                      className="media-content"
                      controls
                      loading="lazy"
                      onLoadedData={(e) => {
                        e.target.style.opacity = 1;
                      }}
                      style={{ opacity: 0 }}
                    />
                  ) : null}

                  {selectedItems.has(item.key) && (
                    <div className="select-indicator">✓</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MasonryGallery; 