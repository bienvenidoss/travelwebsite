import React, { useEffect, useRef } from 'react';
import Packery from 'packery';
import '../styles/masonryGallery.css';

function MasonryGallery({ items, onDelete }) {
  const gridRef = useRef(null);
  const packeryRef = useRef(null);

  useEffect(() => {
    if (!items?.length || !gridRef.current) return;

    console.log('🏗️ Creating Packery instance');
    packeryRef.current = new Packery(gridRef.current, {
      itemSelector: '.grid-item',
      gutter: -1,
      percentPosition: true,
      initLayout: true,
      resize: true
    });

    setTimeout(() => {
      packeryRef.current?.layout();
    }, 100);

    return () => {
      if (packeryRef.current) {
        console.log('🧹 Cleaning up Packery instance');
        packeryRef.current.destroy();
      }
    };
  }, [items]);

  const getItemDimensions = (ratio) => {
    const division = 1;
    const baseWidth = 19.80;
    const isWide = ratio > 1.15;

    if (isWide) {
      return {
        width: `calc(${baseWidth * 2}vw + 1px)`,
        height: `calc(${(baseWidth * 2) / ratio}vw + 1px)`,
        isWide
      };
    } else if (ratio < 0.85) {
      return {
        width: `calc(${baseWidth}vw + 1px)`,
        height: `calc(${baseWidth / ratio}vw + 1px)`,
        isWide: false
      };
    } else {
      return {
        width: `calc(${baseWidth}vw + 1px)`,
        height: `calc(${baseWidth / ratio}vw + 1px)`,
        isWide: false
      };
    }
  };

  return (
    <div className="masonry-wrapper">
      <div 
        className="grid" 
        ref={gridRef}
        style={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto'
        }}
      >
        {items.map((item, index) => {
          const ratio = item.width / item.height;
          const { width, height, isWide } = getItemDimensions(ratio);
          const isFirstItem = index === 0;

          return (
            <div 
              key={item.key || item.fullPath}
              className={`grid-item ${isWide ? 'wide' : ''}`}
              style={{
                width,
                height,
                backgroundColor: item.backgroundColor || '#f0f0f0',
                border: '1px solid white',
                boxSizing: 'border-box',
                position: isFirstItem ? 'relative' : 'absolute',
                left: isFirstItem ? 'unset' : undefined,
                right: isFirstItem ? 'unset' : undefined,
                margin: 0,
                padding: 0,
                overflow: 'hidden'
              }}
            >
              {item.type?.includes('video') ? (
                <video 
                  src={item.downloadUrl} 
                  controls 
                  className="media-element"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <img 
                  src={item.downloadUrl} 
                  alt={item.originalName || ''} 
                  className="media-element"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MasonryGallery; 