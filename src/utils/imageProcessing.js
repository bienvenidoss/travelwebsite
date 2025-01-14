// Get the closest standard ratio for gallery layout
const STANDARD_RATIOS = [1/6, 1/5, 1/4, 1/3, 1/2, 1, 2, 3, 4, 5, 6];

export const getClosestRatio = (width, height) => {
  const ratio = width / height;
  return STANDARD_RATIOS.reduce((prev, curr) => 
    Math.abs(curr - ratio) < Math.abs(prev - ratio) ? curr : prev
  );
};

// Extract color samples from an image
export const extractColorSamples = async (file, sampleCount = 100) => {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const colors = [];
      const blockWidth = img.width / Math.sqrt(sampleCount);
      const blockHeight = img.height / Math.sqrt(sampleCount);
      
      for (let y = 0; y < img.height; y += blockHeight) {
        for (let x = 0; x < img.width; x += blockWidth) {
          const data = ctx.getImageData(x, y, 1, 1).data;
          colors.push({
            r: data[0],
            g: data[1],
            b: data[2],
            position: {
              x: x / img.width,
              y: y / img.height
            }
          });
        }
      }
      
      URL.revokeObjectURL(img.src); // Clean up
      resolve(colors);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Get video thumbnail and extract colors
export const extractVideoThumbnailColors = async (file) => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    video.onloadeddata = () => {
      video.currentTime = 1; // Skip to 1 second to avoid black frames
    };
    
    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const colors = [];
      const blockWidth = video.videoWidth / 10;
      const blockHeight = video.videoHeight / 10;
      
      for (let y = 0; y < video.videoHeight; y += blockHeight) {
        for (let x = 0; x < video.videoWidth; x += blockWidth) {
          const data = ctx.getImageData(x, y, 1, 1).data;
          colors.push({
            r: data[0],
            g: data[1],
            b: data[2],
            position: {
              x: x / video.videoWidth,
              y: y / video.videoHeight
            }
          });
        }
      }
      
      URL.revokeObjectURL(video.src); // Clean up
      resolve(colors);
    };
    
    video.src = URL.createObjectURL(file);
  });
};

// Calculate dominant colors from samples
export const calculateDominantColors = (colorSamples, count = 5) => {
  // Simple clustering to find dominant colors
  const clusters = [];
  
  for (const sample of colorSamples) {
    let foundCluster = false;
    for (const cluster of clusters) {
      const colorDistance = Math.sqrt(
        Math.pow(cluster.r - sample.r, 2) +
        Math.pow(cluster.g - sample.g, 2) +
        Math.pow(cluster.b - sample.b, 2)
      );
      
      if (colorDistance < 30) { // Threshold for similar colors
        cluster.r = (cluster.r * cluster.count + sample.r) / (cluster.count + 1);
        cluster.g = (cluster.g * cluster.count + sample.g) / (cluster.count + 1);
        cluster.b = (cluster.b * cluster.count + sample.b) / (cluster.count + 1);
        cluster.count++;
        foundCluster = true;
        break;
      }
    }
    
    if (!foundCluster) {
      clusters.push({
        r: sample.r,
        g: sample.g,
        b: sample.b,
        count: 1
      });
    }
  }
  
  // Sort clusters by size and return top colors
  return clusters
    .sort((a, b) => b.count - a.count)
    .slice(0, count)
    .map(cluster => ({
      r: Math.round(cluster.r),
      g: Math.round(cluster.g),
      b: Math.round(cluster.b),
      percentage: cluster.count / colorSamples.length
    }));
}; 