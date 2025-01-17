import { deleteAsset, deleteManyAssets, deleteManyDocs, setDoc, listDocs } from "@junobuild/core";

// Storage collection constants
export const STORAGE_COLLECTION = "travel_media";
export const DATASTORE_COLLECTION = "travel_entries";

/**
 * Delete items from both storage and datastore
 * @param {Array} items - Selected items to delete
 */
export const deleteItems = async (items) => {
  try {
    console.group('🗑️ Starting deletion process');
    console.log('📦 Items to delete:', items);

    // Group items by entry key
    const itemsByEntry = items.reduce((acc, item) => {
      if (!acc[item.entryKey]) {
        acc[item.entryKey] = [];
      }
      acc[item.entryKey].push(item);
      return acc;
    }, {});

    console.log('🔍 Grouped by entry:', itemsByEntry);

    // First, fetch all entries we need to process
    const allEntries = await listDocs({
      collection: DATASTORE_COLLECTION
    });

    console.log('📚 All entries fetched:', allEntries.items.length);

    // Process each entry's items in sequence
    for (const [entryKey, entryItems] of Object.entries(itemsByEntry)) {
      console.group(`\n📝 Processing entry: ${entryKey}`);
      try {
        // Find the correct entry
        const entry = allEntries.items.find(e => e.key === entryKey);
        
        if (!entry) {
          console.warn('⚠️ No entry found, skipping...');
          console.groupEnd();
          continue;
        }

        console.log('📄 Current entry:', entry);
        console.log('🎯 Items to remove:', entryItems);

        // 2. Prepare storage assets for this entry (only for items that exist in storage)
        const storageAssets = entryItems
          .filter(item => item.fullPath && item.storageExists !== false)
          .map(item => ({
            collection: STORAGE_COLLECTION,
            fullPath: item.fullPath
          }));

        console.log('💾 Storage assets to delete:', storageAssets);

        // 3. Prepare updated datastore entry
        const currentMedia = entry.data.media || [];
        console.log('📊 Current media items:', currentMedia.length);
        console.log('Current media:', currentMedia);

        const updatedMedia = currentMedia.filter(mediaItem => {
          const shouldKeep = !entryItems.some(itemToDelete => {
            const matchesFullPath = itemToDelete.fullPath === mediaItem.fullPath;
            const matchesKey = itemToDelete.key === mediaItem.key;
            if (matchesFullPath || matchesKey) {
              console.log('🗑️ Will remove media item:', mediaItem);
              console.log('   Matched by:', matchesFullPath ? 'fullPath' : 'key');
            }
            return matchesFullPath || matchesKey;
          });
          return shouldKeep;
        });

        console.log('📊 Remaining media items:', updatedMedia.length);
        console.log('Remaining media:', updatedMedia);

        // 4. Execute operations based on the state
        const operations = [];

        // Handle storage deletions if there are valid storage assets
        if (storageAssets.length > 0) {
          operations.push(
            deleteManyAssets({ assets: storageAssets })
              .then(() => console.log('✅ Storage assets deleted'))
              .catch(error => {
                if (error.message.includes('No asset')) {
                  console.log('ℹ️ Some assets were already deleted');
                } else {
                  console.error('❌ Storage deletion failed:', error);
                }
              })
          );
        }

        // If no media items will remain, delete the entire entry
        if (updatedMedia.length === 0) {
          console.log('🗑️ Entry will be empty, deleting entire entry');
          operations.push(
            deleteManyDocs({
              docs: [{
                collection: DATASTORE_COLLECTION,
                doc: entry
              }]
            })
              .then(() => console.log('✅ Empty entry deleted'))
              .catch(error => {
                console.error('❌ Entry deletion failed:', error);
                throw error;
              })
          );
        } else {
          // Update the entry with remaining media
          const updatedData = {
            ...entry.data,
            media: updatedMedia
          };

          console.log('📝 Updating entry with remaining media');
          operations.push(
            setDoc({
              collection: DATASTORE_COLLECTION,
              doc: {
                key: entry.key,
                data: updatedData,
                description: entry.description,
                version: entry.version
              }
            })
              .then(() => console.log('✅ Entry updated'))
              .catch(error => {
                console.error('❌ Entry update failed:', error);
                throw error;
              })
          );
        }

        // Execute all operations for this entry
        await Promise.all(operations);
        console.log('✅ Entry processing completed');

      } catch (error) {
        console.error('❌ Entry processing failed:', error);
      } finally {
        console.groupEnd();
      }
    }

  } catch (error) {
    console.error('❌ Delete operation failed:', error);
    throw error;
  } finally {
    console.groupEnd();
  }
}; 