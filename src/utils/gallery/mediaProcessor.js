export function processMediaItems(entries) {
  return entries.reduce((acc, entry) => {
    if (!entry.data.media || !Array.isArray(entry.data.media)) {
      console.log(`⚠️ Skipping entry ${entry.key}: invalid media`);
      return acc;
    }

    const processedMedia = entry.data.media.map(media => ({
      ...media,
      entryKey: entry.key,
      key: `${entry.key}-${media.fullPath}`,
      ratio: media.width / media.height,
      backgroundColor: getMediaBackground(media)
    }));

    return [...acc, ...processedMedia];
  }, []);
}

function getMediaBackground(media) {
  if (media.colors?.[0]) {
    const { r, g, b } = media.colors[0];
    return `rgb(${r}, ${g}, ${b})`;
  }
  return '#f0f0f0';
} 