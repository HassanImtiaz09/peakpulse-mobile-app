/**
 * Sentry stub – provides the same public API but does nothing.
 * Replace with real @sentry/react-native when a DSN is configured.
 */

const noop = (..._args: any[]) => {};

const SentryStub = {
  init: noop,
  setUser: noop,
  setContext: noop,
  captureException: noop,
  captureMessage: noop,
};

export function initSentry() {
  console.log("[Sentry] Stub – crash reporting disabled (no SDK installed)");
}

export function setSentryUser(_userId: string, _email?: string) {}

export function clearSentryUser() {}

export function captureError(
  _error: Error,
  _context?: Record<string, unknown>,
) {}

export { SentryStub as Sentry };
