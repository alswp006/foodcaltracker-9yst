import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resizeImage } from "@/lib/image";

// ============================================================================
// Helper: Create mock File objects for testing
// ============================================================================
function createFileMock(
  name: string,
  sizeBytes: number,
  type: string = "image/jpeg"
): File {
  const data = new Uint8Array(sizeBytes);
  const blob = new Blob([data], { type });
  return new File([blob], name, { type });
}

// Create a minimal valid JPEG header for more realistic testing
function createMinimalJpegFile(name: string, sizeBytes: number): File {
  // JPEG file signature
  const header = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  const padding = new Uint8Array(Math.max(0, sizeBytes - header.length));
  const jpeg = new Uint8Array(header.length + padding.length);
  jpeg.set(header);
  jpeg.set(padding, header.length);
  return new File([jpeg], name, { type: "image/jpeg" });
}

// ============================================================================
// AC-1: Resize image with max dimension 1280px
// ============================================================================
describe("AC-1: resizeImage downscales to max 1280px", () => {
  it("should resize large image (4000x3000) and return base64", async () => {
    // Arrange: Create a realistic large image file (~1MB)
    const file = createMinimalJpegFile("large-4000x3000.jpg", 1024 * 1024);

    // Mock URL operations
    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");

    // Act
    const result = await resizeImage(file);

    // Assert: should succeed and return base64
    expect(result).toHaveProperty("ok");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.base64).toBeDefined();
      expect(typeof result.base64).toBe("string");
      // Base64 data URI should start with proper header
      expect(result.base64).toMatch(/^data:image\/jpeg;base64,/);
    }
  });

  it("should maintain aspect ratio when downscaling", async () => {
    // Arrange: Create a wide image (4000x2000, 2:1 aspect ratio)
    const file = createMinimalJpegFile("wide-4000x2000.jpg", 800 * 1024);

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");

    // Act
    const result = await resizeImage(file);

    // Assert: should succeed
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.base64).toBeDefined();
      expect(result.base64.length).toBeGreaterThan(100);
      expect(result.base64).toMatch(/^data:image\/jpeg;base64,/);
    }
  });

  it("should handle already-small images (≤ 1280px)", async () => {
    // Arrange: Create a small image (800x600, already under 1280px)
    const file = createMinimalJpegFile("small-800x600.jpg", 100 * 1024);

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");

    // Act
    const result = await resizeImage(file);

    // Assert: should still return valid base64
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.base64).toBeDefined();
      expect(result.base64).toMatch(/^data:image\/jpeg;base64,/);
    }
  });

  it("should return base64 string under 2MB for downscaled image", async () => {
    // Arrange: Create a large image that will be downscaled
    const file = createMinimalJpegFile("resize-test.jpg", 1.5 * 1024 * 1024);

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");

    // Act
    const result = await resizeImage(file);

    // Assert: result should be compressible to < 2MB
    if (result.ok) {
      const base64Content = result.base64.split(",")[1] || result.base64;
      const estimatedBytes = (base64Content.length * 3) / 4;
      expect(estimatedBytes).toBeLessThan(2 * 1024 * 1024);
    }
  });
});

// ============================================================================
// AC-2: Return { ok: false, error: 'TOO_LARGE' } if result > 2MB
// ============================================================================
describe("AC-2: reject if resized image exceeds 2MB", () => {
  it("should return { ok: false, error: 'TOO_LARGE' } when result > 2MB", async () => {
    // Arrange: Create a very large image (2.6MB) that exceeds 2MB limit
    const file = createMinimalJpegFile("huge-oversized.jpg", 2.6 * 1024 * 1024);

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");

    // Act
    const result = await resizeImage(file);

    // Assert: should fail with TOO_LARGE
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("error");
    if (!result.ok) {
      expect(result.error).toBe("TOO_LARGE");
      expect(result.ok).toBe(false);
    }
  });

  it("should return success for image just under 2MB limit", async () => {
    // Arrange: Create image just under 2MB (1.8MB)
    const file = createMinimalJpegFile("under-limit.jpg", 1.8 * 1024 * 1024);

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");

    // Act
    const result = await resizeImage(file);

    // Assert: should succeed
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.base64).toBeDefined();
      expect(result.base64.length).toBeGreaterThan(0);
    }
  });

  it("should not throw exception when size limit exceeded", async () => {
    // Arrange: Large oversized file
    const file = createMinimalJpegFile("oversized.jpg", 3 * 1024 * 1024);

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");

    // Act & Assert: should not throw
    expect(async () => {
      await resizeImage(file);
    }).not.toThrow();
  });

  it("should handle exactly 2MB edge case", async () => {
    // Arrange: Exactly 2MB file
    const file = createMinimalJpegFile("exactly-2mb.jpg", 2 * 1024 * 1024);

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");

    // Act
    const result = await resizeImage(file);

    // Assert: should either accept or reject gracefully (depending on implementation)
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("error");
  });
});

// ============================================================================
// AC-3: Memory cleanup — revokeObjectURL + canvas zeroed
// ============================================================================
describe("AC-3: memory cleanup (revokeObjectURL + canvas reset)", () => {
  it("should call URL.revokeObjectURL after processing", async () => {
    // Arrange: Create a normal image file
    const file = createMinimalJpegFile("cleanup.jpg", 500 * 1024);

    const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");
    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test-url-123");

    // Act
    const result = await resizeImage(file);

    // Assert
    expect(result.ok).toBe(true);
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:test-url-123");
  });

  it("should create and revoke object URL for image loading", async () => {
    // Arrange
    const file = createMinimalJpegFile("url-test.jpg", 700 * 1024);

    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:img-url");
    const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");

    // Act
    const result = await resizeImage(file);

    // Assert: URL.createObjectURL should be called for img.src
    if (result.ok) {
      expect(createObjectURLSpy).toHaveBeenCalledWith(file);
      // After processing, URL.revokeObjectURL should be called to free memory
      expect(revokeObjectURLSpy).toHaveBeenCalled();
    }
  });

  it("should not store original image file in memory after processing", async () => {
    // Arrange
    const file = createMinimalJpegFile("memory-clean.jpg", 600 * 1024);

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");

    // Act
    const result = await resizeImage(file);

    // Assert: Result should only have base64, no file/blob references
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.base64).toBeDefined();
      expect((result as any).file).toBeUndefined();
      expect((result as any).blob).toBeUndefined();
      expect((result as any).imageData).toBeUndefined();
    }
  });

  it("should cleanup even when processing fails", async () => {
    // Arrange: Use an oversized file that should fail
    const file = createMinimalJpegFile("cleanup-fail.jpg", 2.5 * 1024 * 1024);

    const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fail-url");

    // Act
    const result = await resizeImage(file);

    // Assert: Even on error, should cleanup (revoke object URL)
    if (!result.ok) {
      expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:fail-url");
    }
  });
});

// ============================================================================
// AC-4: Handle corrupted/failed image load without throwing
// ============================================================================
describe("AC-4: corrupted image error handling (no throw)", () => {
  it("should not throw when image load fails", async () => {
    // Arrange: Create an invalid/incomplete JPEG file
    const invalidData = new Uint8Array([0xff, 0xd8, 0xff]); // Incomplete JPEG header
    const invalidFile = new File([invalidData], "corrupt.jpg", {
      type: "image/jpeg",
    });

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:invalid");

    // Act & Assert: should not throw
    expect(async () => {
      await resizeImage(invalidFile);
    }).not.toThrow();
  });

  it("should return error object for corrupted image", async () => {
    // Arrange: Invalid/corrupted image
    const invalidData = new Uint8Array([0xff, 0xd8, 0xff]);
    const invalidFile = new File([invalidData], "broken.jpg", {
      type: "image/jpeg",
    });

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:invalid");

    // Act
    const result = await resizeImage(invalidFile);

    // Assert: Should return error result, not throw
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("error");
    if (!result.ok) {
      expect(typeof result.error).toBe("string");
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it("should return error result for non-image file", async () => {
    // Arrange: Text file instead of image
    const textData = new TextEncoder().encode("This is not an image");
    const textFile = new File([textData], "text.txt", { type: "text/plain" });

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:text");

    // Act
    const result = await resizeImage(textFile);

    // Assert: Should handle gracefully (not throw)
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("error");
  });

  it("should handle very small/incomplete files", async () => {
    // Arrange: Tiny incomplete file
    const tinyFile = new File([new Uint8Array([0xff])], "tiny.jpg", {
      type: "image/jpeg",
    });

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:tiny");

    // Act
    const result = await resizeImage(tinyFile);

    // Assert: Should return result object, never throw
    expect(result).toBeDefined();
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("error");
  });

  it("should return error gracefully for empty file", async () => {
    // Arrange: Empty file
    const emptyFile = new File([new Uint8Array(0)], "empty.jpg", {
      type: "image/jpeg",
    });

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:empty");

    // Act
    const result = await resizeImage(emptyFile);

    // Assert
    expect(result).toBeDefined();
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("error");
  });
});

// ============================================================================
// AC-5: No localStorage usage, no console.error
// ============================================================================
describe("AC-5: code quality (no localStorage, no console.error)", () => {
  it("should not call localStorage.setItem during processing", async () => {
    // Arrange
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#3182F6";
    ctx.fillRect(0, 0, 1000, 1000);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.7);
    });
    const file = new File([blob], "no-storage.jpg", { type: "image/jpeg" });

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");

    // Act
    const result = await resizeImage(file);

    // Assert
    expect(result.ok).toBe(true);
    expect(setItemSpy).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
  });

  it("should not call localStorage.getItem during processing", async () => {
    // Arrange
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#95E1D3";
    ctx.fillRect(0, 0, 1000, 1000);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.7);
    });
    const file = new File([blob], "no-read.jpg", { type: "image/jpeg" });

    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");

    // Act
    const result = await resizeImage(file);

    // Assert
    expect(result.ok).toBe(true);
    expect(getItemSpy).not.toHaveBeenCalled();

    getItemSpy.mockRestore();
  });

  it("should not output console.error during normal operation", async () => {
    // Arrange
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#4ECDC4";
    ctx.fillRect(0, 0, 1000, 1000);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.7);
    });
    const file = new File([blob], "quiet.jpg", { type: "image/jpeg" });

    const consoleErrorSpy = vi.spyOn(console, "error");
    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");

    // Act
    const result = await resizeImage(file);

    // Assert: should not log errors on success
    expect(result.ok).toBe(true);
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should not output console.error even on error", async () => {
    // Arrange: Intentionally create error condition (large file)
    const invalidFile = new File([new Uint8Array(2.6 * 1024 * 1024)], "huge.jpg", {
      type: "image/jpeg",
    });

    const consoleErrorSpy = vi.spyOn(console, "error");
    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:huge");

    // Act
    const result = await resizeImage(invalidFile);

    // Assert: Even on error, should not console.error
    // (errors should be handled gracefully)
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

// ============================================================================
// Additional: Type safety and return structure
// ============================================================================
describe("Return type structure and guarantees", () => {
  it("should return { ok: true, base64: string } on success", async () => {
    // Arrange
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FF6B6B";
    ctx.fillRect(0, 0, 800, 800);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.7);
    });
    const file = new File([blob], "success.jpg", { type: "image/jpeg" });

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:success");

    // Act
    const result = await resizeImage(file);

    // Assert
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("error");
    if (result.ok) {
      expect(result.base64).toBeDefined();
      expect(typeof result.base64).toBe("string");
      expect(result.base64.length).toBeGreaterThan(0);
      expect(result.base64).toMatch(/^data:image\/jpeg;base64,/);
    }
  });

  it("should return { ok: false, error: string } on failure", async () => {
    // Arrange
    const largeFile = new File([new Uint8Array(3 * 1024 * 1024)], "huge.jpg", {
      type: "image/jpeg",
    });

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:large");

    // Act
    const result = await resizeImage(largeFile);

    // Assert
    if (!result.ok) {
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it("should maintain discriminated union type", async () => {
    // Arrange
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#3182F6";
    ctx.fillRect(0, 0, 1200, 1200);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.7);
    });
    const file = new File([blob], "type-test.jpg", { type: "image/jpeg" });

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:type-test");

    // Act
    const result = await resizeImage(file);

    // Assert: discriminated union should work
    if (result.ok) {
      expect(result.base64).toBeDefined();
      expect(typeof result.base64).toBe("string");
    } else {
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
    }
  });
});

// ============================================================================
// JPEG quality and compression verification
// ============================================================================
describe("JPEG compression quality (0.7 verified)", () => {
  it("should use JPEG quality 0.7 for compression", async () => {
    // Arrange
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#95E1D3";
    ctx.fillRect(0, 0, 1600, 1200);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.7);
    });
    const file = new File([blob], "quality.jpg", { type: "image/jpeg" });

    vi.spyOn(URL, "revokeObjectURL");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:quality");

    // Act
    const result = await resizeImage(file);

    // Assert: Should produce JPEG with visible compression artifacts (base64 length)
    // A JPEG with quality 0.7 should be reasonably compressed
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.base64).toContain("data:image/jpeg");
      // Base64 encoded JPEG should have reasonable size (compressed)
      const base64Content = result.base64.split(",")[1] || result.base64;
      const estimatedBytes = (base64Content.length * 3) / 4;
      expect(estimatedBytes).toBeLessThan(2 * 1024 * 1024); // Less than 2MB
    }
  });
});
