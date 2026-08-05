/* oxlint-disable no-console -- demo mock: console output is the point */
// Simulate API call with random failure (30% chance)
export const simulateApiCall = async (operation: string, delay = 1500) => {
  console.log(`[API] Starting ${operation}...`);
  await new Promise((resolve) => {
    return setTimeout(resolve, delay);
  });
  if (Math.random() < 0.3) {
    throw new Error(`${operation} failed: Network error`);
  }
  console.log(`[API] ${operation} completed successfully`);
};
