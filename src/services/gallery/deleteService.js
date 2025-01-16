import { listDocs, setDoc, deleteDoc } from '@junobuild/core';

export async function updateEntryWithRetry(entryKey, itemsToDelete, maxRetries = 3) {
  let datastoreVersions = new Map();
  
  console.group('🗑️ Delete Operation Details');
  console.log('Target Entry Key:', entryKey);
  console.log('Items to Delete:', itemsToDelete);
  
  try {
    // First, verify we have the correct entry
    const response = await listDocs({
      collection: "travel_entries",
    });

    // Find the correct entry that contains our item
    const targetItem = itemsToDelete[0];
    const matchingEntry = response.items.find(entry => 
      entry.data.media?.some(media => 
        media.fullPath === targetItem.fullPath
      )
    );

    if (!matchingEntry) {
      console.error('❌ Could not find entry containing the media item');
      console.log('Target item:', targetItem);
      console.groupEnd();
      return { success: false, error: 'Entry not found' };
    }

    console.log('Found matching entry:', {
      key: matchingEntry.key,
      mediaCount: matchingEntry.data.media?.length
    });

    // Now proceed with deletion using the correct entry
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.group(`Attempt ${attempt + 1}/${maxRetries}`);
        
        const currentMedia = matchingEntry.data.media || [];
        console.log('Current media items:', currentMedia.map(m => m.fullPath));
        console.log('Items to delete:', itemsToDelete.map(i => i.fullPath));

        const updatedMedia = currentMedia.filter(mediaItem => 
          !itemsToDelete.some(item => item.fullPath === mediaItem.fullPath)
        );

        console.log('Media count:', {
          before: currentMedia.length,
          after: updatedMedia.length
        });

        if (updatedMedia.length === currentMedia.length) {
          console.warn('⚠️ No items were removed from media array');
          console.groupEnd();
          continue;
        }

        // Update the entry with the new media array
        await setDoc({
          collection: "travel_entries",
          doc: {
            key: matchingEntry.key,
            data: {
              ...matchingEntry.data,
              media: updatedMedia
            },
            version: matchingEntry.version
          }
        });

        console.log('✅ Successfully updated entry');
        console.groupEnd();
        console.groupEnd();
        return { 
          success: true, 
          itemsProcessed: currentMedia.length - updatedMedia.length 
        };

      } catch (err) {
        console.error('Error during update:', err);
        if (attempt === maxRetries - 1) {
          console.groupEnd();
          console.groupEnd();
          return { success: false, error: err.message };
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.groupEnd();
      }
    }
  } catch (err) {
    console.error('❌ Fatal error:', err);
    console.groupEnd();
    return { success: false, error: err.message };
  }
  
  console.groupEnd();
  return { success: false, error: 'Max retries exceeded' };
} 