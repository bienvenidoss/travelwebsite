import React, { useEffect, useRef, useCallback } from 'react';
import { usePackery } from '../../contexts/PackeryContext';
import GalleryItem from './GalleryItem';
import { getNormalizedSize } from '../../utils/gallery/ratioCalculator';
import '../../styles/packeryGallery.css';

function PackeryGallery({ items, onDelete, selectedItems }) {
  const gridRef = useRef(null);
  const { initializePackery, destroyPackery, relayout } = usePackery();
  const layoutTimeout = useRef(null);

  // Initialize Packery immediately with placeholders
  useEffect(() => {
    if (gridRef.current) {
      console.log('🏗️ Initial layout with placeholders');
      initializePackery(gridRef.current);
      // Force initial layout
      window.requestAnimationFrame(() => {
        relayout();
      });
    }
    return () => {
      if (layoutTimeout.current) {
        window.cancelAnimationFrame(layoutTimeout.current);
      }
      destroyPackery();
    };
  }, []);

  // Update layout when items change
  useEffect(() => {
    if (items.length > 0) {
      if (layoutTimeout.current) {
        window.cancelAnimationFrame(layoutTimeout.current);
      }

      layoutTimeout.current = window.requestAnimationFrame(() => {
        console.log('📐 Updating layout with new items');
        const cleanup = relayout();
        return () => {
          cleanup?.();
        };
      });
    }
  }, [items, relayout]);

  return (
    <div className="packery-grid" ref={gridRef}>
      {items.map((item) => (
        <GalleryItem
          key={item.key}
          item={item}
          dimensions={getNormalizedSize(item.ratio || 1)}
          isSelected={selectedItems?.has(item)}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default PackeryGallery; 