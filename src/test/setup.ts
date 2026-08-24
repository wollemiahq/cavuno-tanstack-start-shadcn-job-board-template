import { afterEach, beforeEach } from 'vitest';

let originalWarn: typeof console.warn;
let originalError: typeof console.error;

function unexpectedConsoleCall(kind: 'warn' | 'error', values: unknown[]) {
  const message = values
    .map((value) =>
      Object.prototype.toString.call(value) === '[object String]'
        ? String(value)
        : JSON.stringify(value, null, 2),
    )
    .join(' ');

  throw new Error(`Unexpected console.${kind}: ${message}`);
}

beforeEach(() => {
  originalWarn = console.warn;
  originalError = console.error;
  console.warn = (...values) => unexpectedConsoleCall('warn', values);
  console.error = (...values) => unexpectedConsoleCall('error', values);

  if (globalThis.window) {
    globalThis.window.scrollTo = () => {};
  }
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
});
