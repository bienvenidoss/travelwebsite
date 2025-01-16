import { useEffect, useRef } from 'react';
import Packery from 'packery';
import imagesLoaded from 'imagesloaded';

export function usePackery(items) {
  const packeryInstance = useRef(null);
  const gridRef = useRef(null);
  const isInitialized = useRef(false);

  // Initialize Packery only once
  useEffect(() => {
    if (!gridRef.current || isInitialized.current) return;

    console.log('🏗️ Initializing Packery');
    packeryInstance.current = new Packery(gridRef.current, {
      itemSelector: '.grid-item',
      gutter: 0,
      percentPosition: false,
      transitionDuration: '0.2s'
    });

    isInitialized.current = true;

    return () => {
      console.log('🧹 Cleaning up Packery');
      packeryInstance.current?.destroy();
      packeryInstance.current = null;
      isInitialized.current = false;
    };
  }, []);

  // Handle layout updates
  useEffect(() => {
    if (!packeryInstance.current || !items.length) return;

    console.log('📐 Updating layout for', items.length, 'items');
    const imgLoad = imagesLoaded(gridRef.current);
    
    const onProgress = () => {
      if (packeryInstance.current) {
        packeryInstance.current.layout();
      }
    };

    imgLoad.on('progress', onProgress);
    imgLoad.on('done', onProgress);

    return () => {
      imgLoad.off('progress', onProgress);
      imgLoad.off('done', onProgress);
    };
  }, [items]);

  return gridRef;
} 