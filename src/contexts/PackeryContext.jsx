import React, { createContext, useContext, useRef, useCallback } from 'react';
import Packery from 'packery';
import imagesLoaded from 'imagesloaded';

const PackeryContext = createContext(null);

export function PackeryProvider({ children }) {
  const packeryInstance = useRef(null);
  const gridRef = useRef(null);
  const resizeTimeout = useRef(null);
  const isInitializing = useRef(false);

  const handleResize = useCallback(() => {
    if (resizeTimeout.current) {
      window.cancelAnimationFrame(resizeTimeout.current);
    }

    resizeTimeout.current = window.requestAnimationFrame(() => {
      if (packeryInstance.current) {
        console.log('📏 Handling resize');
        packeryInstance.current.layout();
      }
    });
  }, []);

  const initializePackery = useCallback((element) => {
    if (packeryInstance.current || isInitializing.current) {
      console.log('🔄 Packery already initialized or initializing, skipping');
      return;
    }

    isInitializing.current = true;
    console.log('🏗️ Initializing Packery');
    
    gridRef.current = element;
    packeryInstance.current = new Packery(element, {
      itemSelector: '.grid-item',
      gutter: 0,
      percentPosition: false,
      transitionDuration: '0.2s'
    });

    window.addEventListener('resize', handleResize, { passive: true });
    isInitializing.current = false;
  }, []);

  const destroyPackery = () => {
    if (packeryInstance.current) {
      console.log('🧹 Cleaning up Packery');
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout.current) {
        window.cancelAnimationFrame(resizeTimeout.current);
      }
      packeryInstance.current.destroy();
      packeryInstance.current = null;
      gridRef.current = null;
    }
  };

  const relayout = useCallback(() => {
    if (!packeryInstance.current || !gridRef.current) return;

    console.log('📐 Updating Packery layout');
    const imgLoad = imagesLoaded(gridRef.current);
    
    const layoutOnce = () => {
      if (packeryInstance.current) {
        window.requestAnimationFrame(() => {
          packeryInstance.current.layout();
        });
      }
    };

    imgLoad.on('progress', layoutOnce);
    imgLoad.on('done', layoutOnce);

    return () => {
      imgLoad.off('progress', layoutOnce);
      imgLoad.off('done', layoutOnce);
    };
  }, []);

  const removeItems = useCallback((elements) => {
    if (!packeryInstance.current) return;

    console.log('🗑️ Removing items from Packery');
    packeryInstance.current.remove(elements);
    packeryInstance.current.shiftLayout();
  }, []);

  return (
    <PackeryContext.Provider value={{ 
      initializePackery, 
      destroyPackery, 
      relayout,
      removeItems 
    }}>
      {children}
    </PackeryContext.Provider>
  );
}

export const usePackery = () => {
  const context = useContext(PackeryContext);
  if (!context) {
    throw new Error('usePackery must be used within a PackeryProvider');
  }
  return context;
}; 