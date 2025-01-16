import React, { useEffect, useRef } from 'react';
import { usePackery } from '../../contexts/PackeryContext';
import GalleryItem from './GalleryItem';
import { getNormalizedSize } from '../../utils/gallery/ratioCalculator';
import '../../styles/packeryGallery.css';

function PackeryGallery({ items, onDelete, selectedItems, onSelectItem, isSelectionMode }) {
  const gridRef = useRef(null);
  const itemRefs = useRef(new Map());
  const { initializePackery, destroyPackery, relayout, removeItems } = usePackery();

  // Initialize Packery once
  useEffect(() => {
    if (gridRef.current) {
      initializePackery(gridRef.current);
    }
    return () => destroyPackery();
  }, []);

  // Handle layout updates when items change
  useEffect(() => {
    if (items.length > 0) {
      const cleanup = relayout();
      return cleanup;
    }
  }, [items]);

  const handleDelete = (item, element) => {
    onDelete(item);
    // Store the DOM element reference for later removal
    itemRefs.current.set(item.key, element);
  };

  // Handle actual DOM removal when items are deleted
  useEffect(() => {
    const previousItems = new Set(Array.from(itemRefs.current.keys()));
    const currentItems = new Set(items.map(item => item.key));
    
    // Find items that were in the previous set but not in the current set
    const removedItems = Array.from(previousItems).filter(
      key => !currentItems.has(key)
    );

    if (removedItems.length > 0) {
      console.log('🗑️ Removing items from layout:', removedItems);
      const elementsToRemove = removedItems
        .map(key => itemRefs.current.get(key))
        .filter(Boolean);

      removeItems(elementsToRemove);

      // Clean up references
      removedItems.forEach(key => itemRefs.current.delete(key));
    }
  }, [items, removeItems]);

  return (
    <div className="packery-grid" ref={gridRef}>
      {items.map((item) => (
        <GalleryItem
          key={item.key}
          item={item}
          dimensions={getNormalizedSize(item.ratio || 1)}
          isSelected={selectedItems?.has(item)}
          onSelect={onSelectItem}
          isSelectionMode={isSelectionMode}
          ref={(el) => {
            if (el) {
              itemRefs.current.set(item.key, el);
            } else {
              itemRefs.current.delete(item.key);
            }
          }}
        />
      ))}
    </div>
  );
}

export default PackeryGallery; 