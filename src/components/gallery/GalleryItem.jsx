import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { IoCheckmarkCircle } from "react-icons/io5";
import { FaTrash } from "react-icons/fa";

const GalleryItem = forwardRef(({ 
  item, 
  dimensions, 
  isSelected, 
  onSelect, 
  isSelectionMode 
}, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const itemRef = useRef(null);

  // Forward ref and setup intersection observer
  useEffect(() => {
    if (ref) {
      ref(itemRef.current);
    }
  }, [ref]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.01
      }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleClick = (e) => {
    // If clicked on trash icon, start selection mode
    if (e.target.closest('.delete-trigger')) {
      e.stopPropagation();
      onSelect(item, true); // Pass true to start selection mode
      return;
    }

    // If in selection mode or already selected, toggle selection
    if (isSelectionMode || isSelected) {
      onSelect(item);
    }
  };

  return (
    <div 
      ref={itemRef}
      className={`grid-item ${isLoaded ? 'loaded' : 'loading'} ${isSelected ? 'selected' : ''} ${isSelectionMode ? 'selection-mode' : ''}`}
      onClick={handleClick}
      style={{
        width: dimensions.width, 
        height: dimensions.height,
        backgroundColor: item.backgroundColor || '#f0f0f0',
        position: 'relative',
      }}
    >
      {/* Background color div */}
      <div 
        className="background-color"
        style={{ 
          backgroundColor: item.backgroundColor || '#f0f0f0',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1
        }} 
      />

      {/* Image/Video container */}
      <div 
        className="media-container"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2
        }}
      >
        {isInView && (
          item.type?.startsWith('image/') ? (
            <img
              src={item.downloadUrl}
              alt={item.originalName}
              onLoad={() => setIsLoaded(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: isLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
              }}
            />
          ) : (
            <video
              src={item.downloadUrl}
              controls
              preload="metadata"
              onLoadedMetadata={() => setIsLoaded(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: isLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
              }}
            />
          )
        )}
      </div>

      {/* Only show delete trigger when not in selection mode */}
      {!isSelectionMode && !isSelected && (
        <div className="delete-trigger">
          <FaTrash />
        </div>
      )}

      {/* Selection overlay - now visible on hover in selection mode */}
      <div 
        className={`selection-overlay ${isSelected ? 'visible' : ''}`}
        style={{ zIndex: 3 }}
      >
        <IoCheckmarkCircle className="check-icon" />
      </div>

      {/* Loading shimmer */}
      {!isLoaded && (
        <div className="shimmer-wrapper" style={{ zIndex: 4 }}>
          <div className="shimmer" />
        </div>
      )}
    </div>
  );
});

export default GalleryItem; 