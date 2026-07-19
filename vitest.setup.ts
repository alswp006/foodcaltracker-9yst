/**
 * Vitest setup — runs before each test file.
 *
 * Handles:
 *  - localStorage isolation between tests (prevents cross-test pollution)
 *  - requestAnimationFrame shim for jsdom (needed for animate/countup utilities)
 *  - sessionStorage isolation
 *  - console.error filtering (React Router warnings etc.)
 *  - Canvas/Image/URL.createObjectURL shims for jsdom (no native "canvas" package installed —
 *    jsdom's HTMLCanvasElement.getContext/toBlob and Image load/error events are pure no-ops
 *    without it, so image-resize utilities need light stand-ins to be testable)
 */

import { beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// ── localStorage / sessionStorage isolation ──
// jsdom's storage persists between tests by default. Clear it to prevent pollution.
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// ── requestAnimationFrame shim for jsdom ──
// jsdom does NOT implement rAF natively, so animate/countup code hangs forever.
// Shim that immediately invokes callback with a monotonic timestamp.
if (typeof globalThis.requestAnimationFrame !== "function") {
  let now = 0;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    now += 16;
    return setTimeout(() => cb(now), 0) as unknown as number;
  }) as typeof globalThis.requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof globalThis.cancelAnimationFrame;
}

// ── URL.createObjectURL / revokeObjectURL shim ──
// jsdom does not implement these at all (not even as a no-op stub), so code that calls them
// throws, and `vi.spyOn(URL, "createObjectURL")` fails with "does not exist".
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = (() => `blob:mock-${Math.random().toString(36).slice(2)}`) as typeof URL.createObjectURL;
}
if (typeof URL.revokeObjectURL !== "function") {
  URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
}

// ── HTMLCanvasElement.getContext/toBlob/toDataURL shim ──
// jsdom only implements canvas 2D rendering + encoding via the optional native "canvas" package.
// Without it, getContext('2d') returns null and toBlob/toDataURL are unavailable. This stand-in
// provides a no-op 2D context and produces real (but content-arbitrary) JPEG-signed Blobs/data URIs
// so canvas-based resize/compress code can be exercised in tests.
if (typeof HTMLCanvasElement !== "undefined") {
  const noop = () => {};
  const fakeContext = {
    fillStyle: "#000000",
    fillRect: noop,
    clearRect: noop,
    drawImage: noop,
    save: noop,
    restore: noop,
    scale: noop,
    translate: noop,
  };

  const fakeEncodedBytes = (canvas: HTMLCanvasElement) => {
    const pixelCount = Math.max(1, canvas.width * canvas.height);
    const size = Math.min(Math.max(pixelCount, 256), 4096);
    const bytes = new Uint8Array(size).fill(0);
    // Valid JPEG SOI + APP0 signature so downstream signature-sniffing accepts the fake output.
    bytes.set([0xff, 0xd8, 0xff, 0xe0]);
    return bytes;
  };

  HTMLCanvasElement.prototype.getContext = function () {
    return fakeContext as unknown as CanvasRenderingContext2D;
  } as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toBlob = function (
    callback: BlobCallback,
    type = "image/png",
  ) {
    const bytes = fakeEncodedBytes(this);
    setTimeout(() => callback(new Blob([bytes], { type })), 0);
  };

  HTMLCanvasElement.prototype.toDataURL = function (type = "image/png") {
    const bytes = fakeEncodedBytes(this);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return `data:${type};base64,${btoa(binary)}`;
  };
}

// ── HTMLImageElement load shim ──
// Without the native "canvas" package, jsdom's `_updateTheImageData` bails out immediately
// (`if (!Canvas) return;`), so `img.onload`/`onerror` never fire and naturalWidth/Height stay 0.
// Shim `src` to always report a decoded image asynchronously, so Image-based decode code resolves.
if (typeof HTMLImageElement !== "undefined") {
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    configurable: true,
    get(this: HTMLImageElement) {
      return (this as unknown as { _mockSrc?: string })._mockSrc ?? "";
    },
    set(this: HTMLImageElement, value: string) {
      (this as unknown as { _mockSrc?: string })._mockSrc = value;
      queueMicrotask(() => {
        if (!value) return;
        if (typeof this.onload === "function") {
          this.onload(new Event("load"));
        }
      });
    },
  });
  Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", {
    configurable: true,
    get: () => 1600,
  });
  Object.defineProperty(HTMLImageElement.prototype, "naturalHeight", {
    configurable: true,
    get: () => 1200,
  });
}

// ── afterEach reset ──
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers(); // in case a test used fake timers
});
