/**
 * TASK-023: wrap a promise with a hard timeout.
 * Prefer provider-level AbortController when available; this is a safety net.
 */

export class TimeoutError extends Error {
  readonly code = "TIMEOUT" as const;

  constructor(message = "请求超时") {
    super(message);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "请求超时",
): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(message));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
