import React, { useState, useRef, useEffect } from 'react';

function GalleryItem({ item, dimensions, isSelected, onDelete }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const itemRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading slightly before the item comes into view
      }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={itemRef}
      className={`grid-item ${isLoaded ? 'loaded' : 'loading'}`}
      style={{ 
        width: dimensions.width, 
        height: dimensions.height,
        outline: '1px solid white',
        outlineOffset: '-1px',
        backgroundColor: item.backgroundColor || '#f0f0f0'
      }}
    >
      {isInView && (
        item.type?.startsWith('image/') ? (
          <img
            src={item.downloadUrl}
            alt={item.originalName}
            onLoad={() => setIsLoaded(true)}
            style={{ 
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out'
            }}
          />
        ) : (
          <video
            src={item.downloadUrl}
            controls
            preload="metadata"
            onLoadedMetadata={() => setIsLoaded(true)}
            style={{ 
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out'
            }}
          />
        )
      )}

      {/* Placeholder shimmer effect */}
      {!isLoaded && (
        <div className="shimmer-wrapper">
          <div className="shimmer" />
        </div>
      )}

      {isSelected && (
        <div className="selected-overlay" />
      )}

      <button
        className="delete-button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item);
        }}
      >
        ×
      </button>
    </div>
  );
}

export default GalleryItem; 