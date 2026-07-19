import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FoodCandidate, FoodDbItem, MealType } from "@/lib/types";

// Mock fetch at module level
global.fetch = vi.fn() as any;

/**
 * Test Suite: External API Client (AI Recognition / Food Search)
 *
 * Tests for src/lib/api.ts functions:
 * - analyzeImage: POST /api/vision/analyze with 15s timeout
 * - searchFoods: GET /api/foods/search with abort signal support
 *
 * AC1: 15s timeout handling
 * AC2: 422 NO_FOOD_DETECTED error mapping
 * AC3: 200 with empty items array normalization
 * AC4: searchFoods abort signal handling (no throw, return { ok:false, error:'ABORTED' })
 * AC5: URL construction (limit=20, encodeURIComponent for q)
 * AC6: No console.error, use VITE_API_BASE_URL
 */

describe("External API Client (analyzeImage & searchFoods)", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  // ============================================================================
  // analyzeImage Tests
  // ============================================================================

  describe("analyzeImage", () => {
    it("AC-1a: should return normalized error on 15s timeout (AbortController)", async () => {
      // Arrange: Mock fetch to simulate timeout by setting up AbortController
      const timeoutMs = 15000;
      (global.fetch as any) = vi.fn(async () => {
        // Simulate timeout by waiting beyond the timeout period
        await new Promise((_, reject) => {
          const timer = setTimeout(
            () => reject(new DOMException("Aborted", "AbortError")),
            timeoutMs + 100
          );
          return () => clearTimeout(timer);
        });
      });

      const { analyzeImage } = await import("@/lib/api");
      const imageBase64 = "data:image/jpeg;base64,abc123";
      const mealType: MealType = "lunch";

      // Act
      const result = await analyzeImage(imageBase64, mealType);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("NETWORK");
        expect(result.message).toBe(
          "네트워크 연결을 확인해주세요"
        );
      }
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it("AC-1b: should not throw on timeout, return normalized error object", async () => {
      // Arrange
      globalThis.fetch = vi.fn().mockRejectedValueOnce(
        new DOMException("Aborted", "AbortError")
      );

      const { analyzeImage } = await import("@/lib/api");
      const imageBase64 = "data:image/jpeg;base64,xyz789";
      const mealType: MealType = "breakfast";

      // Act & Assert: should not throw
      const result = await analyzeImage(imageBase64, mealType);
      expect(result).toHaveProperty("ok");
      expect(result).toHaveProperty("error");
      expect(result).toHaveProperty("message");
      expect(result.ok).toBe(false);
    });

    it("AC-2: should map 422 NO_FOOD_DETECTED to Korean message", async () => {
      // Arrange
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ error: "NO_FOOD_DETECTED" }),
      } as Response);

      const { analyzeImage } = await import("@/lib/api");
      const imageBase64 = "data:image/jpeg;base64,test123";
      const mealType: MealType = "dinner";

      // Act
      const result = await analyzeImage(imageBase64, mealType);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("NO_FOOD_DETECTED");
        expect(result.message).toBe(
          "음식을 찾지 못했어요. 다시 찍거나 직접 검색해보세요"
        );
      }
    });

    it("AC-3: should normalize 200 OK with empty items array to NO_FOOD_DETECTED message", async () => {
      // Arrange
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      } as Response);

      const { analyzeImage } = await import("@/lib/api");
      const imageBase64 = "data:image/jpeg;base64,empty123";
      const mealType: MealType = "snack";

      // Act
      const result = await analyzeImage(imageBase64, mealType);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("NO_FOOD_DETECTED");
        expect(result.message).toBe(
          "음식을 찾지 못했어요. 다시 찍거나 직접 검색해보세요"
        );
      }
    });

    it("AC-2b: should handle 413 IMAGE_TOO_LARGE error", async () => {
      // Arrange
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 413,
        json: async () => ({ error: "IMAGE_TOO_LARGE" }),
      } as Response);

      const { analyzeImage } = await import("@/lib/api");
      const imageBase64 = "data:image/jpeg;base64,huge";
      const mealType: MealType = "lunch";

      // Act
      const result = await analyzeImage(imageBase64, mealType);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("IMAGE_TOO_LARGE");
        expect(result.message).toBeDefined();
        expect(typeof result.message).toBe("string");
      }
    });

    it("AC-2c: should handle 429 RATE_LIMITED error", async () => {
      // Arrange
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: "RATE_LIMITED" }),
      } as Response);

      const { analyzeImage } = await import("@/lib/api");
      const imageBase64 = "data:image/jpeg;base64,rapid";
      const mealType: MealType = "breakfast";

      // Act
      const result = await analyzeImage(imageBase64, mealType);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("RATE_LIMITED");
        expect(result.message).toBeDefined();
      }
    });

    it("AC-2d: should handle 500 INTERNAL_ERROR", async () => {
      // Arrange
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "INTERNAL_ERROR" }),
      } as Response);

      const { analyzeImage } = await import("@/lib/api");
      const imageBase64 = "data:image/jpeg;base64,error";
      const mealType: MealType = "dinner";

      // Act
      const result = await analyzeImage(imageBase64, mealType);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("INTERNAL_ERROR");
        expect(result.message).toBeDefined();
      }
    });

    it("should include POST body with imageBase64 and mealType", async () => {
      // Arrange
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: "1",
              name: "rice",
              calories: 130,
              protein: 2.7,
              carbs: 28,
              fat: 0.3,
              unit: "100g",
            },
          ],
        }),
      } as Response);

      const { analyzeImage } = await import("@/lib/api");
      const imageBase64 = "data:image/jpeg;base64,test";
      const mealType: MealType = "lunch";

      // Act
      await analyzeImage(imageBase64, mealType);

      // Assert: verify fetch was called with correct POST body
      expect(globalThis.fetch).toHaveBeenCalled();
      const call = (globalThis.fetch as any).mock.calls[0];
      expect(call).toBeDefined();
      const [url, options] = call;
      expect(options.method).toBe("POST");
      if (typeof options.body === "string") {
        const body = JSON.parse(options.body);
        expect(body.imageBase64).toBe(imageBase64);
        expect(body.mealType).toBe(mealType);
      }
    });

    it("should return successful result with FoodCandidate array", async () => {
      // Arrange
      const mockFood: FoodCandidate = {
        foodName: "grilled chicken breast",
        confidence: 0.95,
        amountGram: 100,
        kcal: 165,
        proteinG: 31,
        carbG: 0,
        fatG: 3.6,
      };

      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [mockFood] }),
      } as Response);

      const { analyzeImage } = await import("@/lib/api");
      const imageBase64 = "data:image/jpeg;base64,chicken";
      const mealType: MealType = "lunch";

      // Act
      const result = await analyzeImage(imageBase64, mealType);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data[0]).toEqual(mockFood);
      }
    });
  });

  // ============================================================================
  // searchFoods Tests
  // ============================================================================

  describe("searchFoods", () => {
    it("AC-4a: should handle abort signal without throwing, return { ok:false, error:'ABORTED' }", async () => {
      // Arrange
      const controller = new AbortController();
      globalThis.fetch = vi.fn().mockImplementation(() => {
        controller.abort();
        return Promise.reject(new DOMException("Aborted", "AbortError"));
      });

      const { searchFoods } = await import("@/lib/api");
      const query = "chicken";

      // Act & Assert: should not throw
      const result = await searchFoods(query, controller.signal);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("ABORTED");
        expect(result.message).toBeDefined();
      }
    });

    it("AC-4b: should accept external abort signal and gracefully handle abort", async () => {
      // Arrange
      const controller = new AbortController();
      let fetchCalled = false;

      globalThis.fetch = vi.fn().mockImplementation(() => {
        fetchCalled = true;
        // Simulate abort signal being triggered
        return Promise.reject(new DOMException("Aborted", "AbortError"));
      });

      const { searchFoods } = await import("@/lib/api");
      const query = "rice";

      // Act
      const result = await searchFoods(query, controller.signal);

      // Assert
      expect(fetchCalled).toBe(true);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("ABORTED");
      }
    });

    it("AC-5a: should construct URL with limit=20 parameter", async () => {
      // Arrange
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ foods: [] }),
      } as Response);

      const { searchFoods } = await import("@/lib/api");
      const query = "pasta";

      // Act
      await searchFoods(query);

      // Assert: verify URL contains limit=20
      expect(globalThis.fetch).toHaveBeenCalled();
      const call = (globalThis.fetch as any).mock.calls[0];
      const [url] = call;
      expect(url).toContain("limit=20");
    });

    it("AC-5b: should encodeURIComponent the query parameter", async () => {
      // Arrange
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ foods: [] }),
      } as Response);

      const { searchFoods } = await import("@/lib/api");
      const query = "김치 스파게티 & pasta"; // query with special chars

      // Act
      await searchFoods(query);

      // Assert: verify query is URL-encoded
      expect(globalThis.fetch).toHaveBeenCalled();
      const call = (globalThis.fetch as any).mock.calls[0];
      const [url] = call;
      // The URL should contain encoded version of the query
      const expectedEncoded = encodeURIComponent(query);
      expect(url).toContain(expectedEncoded);
    });

    it("AC-5c: should construct GET URL with q parameter", async () => {
      // Arrange
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ foods: [] }),
      } as Response);

      const { searchFoods } = await import("@/lib/api");
      const query = "salad";

      // Act
      await searchFoods(query);

      // Assert
      expect(globalThis.fetch).toHaveBeenCalled();
      const call = (globalThis.fetch as any).mock.calls[0];
      const [url, options] = call;
      expect(url).toContain("q=");
      expect(options.method || "GET").toBe("GET"); // default is GET
    });

    it("should return array of FoodDbItem on success", async () => {
      // Arrange
      const mockFoods: FoodDbItem[] = [
        {
          foodId: "apple1",
          foodName: "red apple",
          brand: "",
          servingGram: 100,
          kcalPer100g: 52,
          proteinPer100g: 0.3,
          carbPer100g: 14,
          fatPer100g: 0.2,
        },
        {
          foodId: "apple2",
          foodName: "green apple",
          brand: "",
          servingGram: 100,
          kcalPer100g: 52,
          proteinPer100g: 0.3,
          carbPer100g: 14,
          fatPer100g: 0.2,
        },
      ];

      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ foods: mockFoods }),
      } as Response);

      const { searchFoods } = await import("@/lib/api");
      const query = "apple";

      // Act
      const result = await searchFoods(query);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data).toHaveLength(2);
        expect(result.data[0].foodName).toBe("red apple");
        expect(result.data[1].foodName).toBe("green apple");
      }
    });

    it("should handle 500 server error with graceful normalization", async () => {
      // Arrange
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "INTERNAL_ERROR" }),
      } as Response);

      const { searchFoods } = await import("@/lib/api");
      const query = "bread";

      // Act
      const result = await searchFoods(query);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("INTERNAL_ERROR");
        expect(result.message).toBeDefined();
      }
    });

    it("should use import.meta.env.VITE_API_BASE_URL for base URL", async () => {
      // Arrange
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ foods: [] }),
      } as Response);

      const { searchFoods } = await import("@/lib/api");
      const query = "test";

      // Act
      await searchFoods(query);

      // Assert
      expect(globalThis.fetch).toHaveBeenCalled();
      const call = (globalThis.fetch as any).mock.calls[0];
      const [url] = call;
      // URL should start with the API base (import.meta.env.VITE_API_BASE_URL)
      // We can't directly assert the env value in tests, but we can verify
      // the URL structure starts with http/https and contains api/foods
      expect(url).toMatch(/^https?:\/\/.+\/api\/foods\/search/);
    });
  });

  // ============================================================================
  // Error Handling & Normalization Tests
  // ============================================================================

  describe("Error handling & normalization", () => {
    it("AC-6: should never call console.error, all errors normalized to result objects", async () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, "error");
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          json: async () => ({ error: "NO_FOOD_DETECTED" }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: "INTERNAL_ERROR" }),
        } as Response)
        .mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));

      const { analyzeImage, searchFoods } = await import("@/lib/api");

      // Act: trigger various error conditions
      await analyzeImage("data:image/jpeg;base64,test", "lunch");
      await searchFoods("query");
      await searchFoods("query2");

      // Assert: console.error was never called
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should return consistent result object structure for all responses", async () => {
      // Arrange
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                id: "1",
                name: "food",
                calories: 100,
                protein: 10,
                carbs: 20,
                fat: 5,
                unit: "100g",
              },
            ],
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          json: async () => ({ error: "NO_FOOD_DETECTED" }),
        } as Response);

      const { analyzeImage } = await import("@/lib/api");

      // Act: success case
      const successResult = await analyzeImage("data:image/jpeg;base64,test1", "lunch");
      // Act: error case
      const errorResult = await analyzeImage("data:image/jpeg;base64,test2", "lunch");

      // Assert: both have ok property, data/error/message as needed
      expect(successResult).toHaveProperty("ok");
      expect(errorResult).toHaveProperty("ok");

      if (successResult.ok) {
        expect(successResult).toHaveProperty("data");
      }
      if (!errorResult.ok) {
        expect(errorResult).toHaveProperty("error");
        expect(errorResult).toHaveProperty("message");
      }
    });
  });

  // ============================================================================
  // API URL & Base Configuration Tests
  // ============================================================================

  describe("API configuration", () => {
    it("should use POST method for analyzeImage request", async () => {
      // Arrange
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      } as Response);

      const { analyzeImage } = await import("@/lib/api");

      // Act
      await analyzeImage("data:image/jpeg;base64,test", "breakfast");

      // Assert
      const call = (globalThis.fetch as any).mock.calls[0];
      const [, options] = call;
      expect(options.method).toBe("POST");
    });

    it("should use GET method for searchFoods request", async () => {
      // Arrange
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ foods: [] }),
      } as Response);

      const { searchFoods } = await import("@/lib/api");

      // Act
      await searchFoods("chicken");

      // Assert
      const call = (globalThis.fetch as any).mock.calls[0];
      const [, options] = call;
      expect(options.method || "GET").toBe("GET");
    });

    it("should include Content-Type header for analyzeImage", async () => {
      // Arrange
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      } as Response);

      const { analyzeImage } = await import("@/lib/api");

      // Act
      await analyzeImage("data:image/jpeg;base64,test", "lunch");

      // Assert
      const call = (globalThis.fetch as any).mock.calls[0];
      const [, options] = call;
      expect(options.headers).toBeDefined();
      if (typeof options.headers === "object") {
        expect(options.headers["Content-Type"]).toBe("application/json");
      }
    });
  });
});
