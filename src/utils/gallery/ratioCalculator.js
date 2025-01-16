const BASE_SIZE = 200;
const STANDARD_RATIOS = [1/6, 1/5, 1/4, 1/3, 1/2, 1, 2, 3, 4, 5, 6];

export function getNormalizedSize(ratio) {
  const closestRatio = STANDARD_RATIOS.reduce((prev, curr) => 
    Math.abs(curr - ratio) < Math.abs(prev - ratio) ? curr : prev
  );

  return closestRatio >= 1 
    ? { width: BASE_SIZE * closestRatio, height: BASE_SIZE }
    : { width: BASE_SIZE, height: BASE_SIZE / closestRatio };
} 