// Preserve errors locally, with the scene name and asset path needed for debugging.
function report(error, source, details = {}) {
  console.error('[Edition]', source, JSON.stringify(details), error);
}
const logger = { logError: (error, details) => report(error, 'React', details), isLoggingReady: true };
export const i = () => logger;
export { report as t };
