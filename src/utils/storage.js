import { uploadFile, setDoc } from '@junobuild/core';
import { nanoid } from 'nanoid';
import { 
  getClosestRatio, 
  extractColorSamples, 
  extractVideoThumbnailColors, 
  calculateDominantColors 
} from './imageProcessing';

const BATCH_SIZE = 3; // Number of concurrent uploads
const MAX_RETRIES = 3; // Maximum number of retry attempts

const getImageDimensions = async (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
    };
  });
};

const getVideoDimensions = async (file) => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight
      });
    };
  });
};

const processFile = async (file, retryCount = 0) => {
  try {
    const filename = `${nanoid()}-${file.name}`;
    let collection = 'travel_media';
    let dimensions, colorSamples, ratio;

    if (file.type.startsWith('image/')) {
      dimensions = await getImageDimensions(file);
      colorSamples = await extractColorSamples(file);
    } else if (file.type.startsWith('video/')) {
      dimensions = await getVideoDimensions(file);
      colorSamples = await extractVideoThumbnailColors(file);
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    ratio = getClosestRatio(dimensions.width, dimensions.height);
    const dominantColors = calculateDominantColors(colorSamples);

    const response = await uploadFile({
      collection,
      data: file,
      filename
    });

    return {
      downloadUrl: response.downloadUrl,
      fullPath: response.fullPath,
      type: file.type,
      originalName: file.name,
      size: file.size,
      width: dimensions.width,
      height: dimensions.height,
      ratio,
      colors: dominantColors
    };
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying upload for ${file.name} (attempt ${retryCount + 1})`);
      return processFile(file, retryCount + 1);
    }
    throw error;
  }
};

const processBatch = async (files, onProgress) => {
  const results = [];
  
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(file => processFile(file));
    
    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Calculate and report progress
      const progress = Math.min(((i + BATCH_SIZE) / files.length) * 100, 100);
      onProgress({
        processed: results.length,
        total: files.length,
        progress,
        currentBatch: {
          start: i,
          end: Math.min(i + BATCH_SIZE, files.length)
        }
      });
    } catch (error) {
      console.error(`Error processing batch starting at index ${i}:`, error);
      throw error;
    }
  }
  
  return results;
};

export const uploadFiles = async (files, onProgress = () => {}) => {
  try {
    return await processBatch(files, onProgress);
  } catch (error) {
    console.error('Error in uploadFiles:', error);
    throw new Error('Failed to upload some files. Please try again.');
  }
};

export const saveEntry = async (formData, onProgress) => {
  try {
    const { files, ...data } = formData;
    
    // Upload files first if there are any
    const uploadedFiles = files.length > 0 ? 
      await uploadFiles(files, onProgress) : [];

    // Clean and prepare tags
    const cleanTags = data.tags
      ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      : [];

    // Prepare entry document
    const entry = {
      ...data,
      tags: cleanTags,
      media: uploadedFiles,
      createdAt: new Date().toISOString()
    };

    // Save to Juno datastore
    const response = await setDoc({
      collection: "travel_entries",
      doc: {
        key: nanoid(),
        data: entry,
        description: data.title
      }
    });

    return response;
  } catch (error) {
    console.error('Error saving entry:', error);
    throw new Error('Failed to save entry. Please try again.');
  }
}; 