/* oxlint-disable no-console -- demo mock: console output is the point */
// Fails at random, 30% of the time.
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
