import { describe, it, expect, beforeEach } from "vitest";
import { mealsRepo } from "@/data/mealsRepo";
import { todayKST } from "@/lib/date";

const validInput = {
  mealType: "lunch" as const,
  foodName: "계란",
  source: "manual" as const,
  amountGram: 100,
  kcal: 155,
  carbG: 1.1,
  proteinG: 13.0,
  fatG: 11.0,
  aiGenerated: false,
  edited: false,
};

describe("mealsRepo", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("adds a meal with generated id and KST date", () => {
    const added = mealsRepo.add(validInput);
    expect(added.id).toBeTruthy();
    expect(added.date).toBe(todayKST());
  });

  it("rejects non-integer amountGram", () => {
    expect(() => mealsRepo.add({ ...validInput, amountGram: 1.5 })).toThrow();
  });

  it("rejects non-integer kcal", () => {
    expect(() => mealsRepo.add({ ...validInput, kcal: 100.5 })).toThrow();
  });

  it("updates only patched fields", () => {
    const added = mealsRepo.add(validInput);
    const updated = mealsRepo.update(added.id, { amountGram: 200 });
    expect(updated.amountGram).toBe(200);
    expect(updated.foodName).toBe(validInput.foodName);
  });

  it("throws when updating a non-existent id", () => {
    expect(() => mealsRepo.update("missing-id", { amountGram: 200 })).toThrow();
  });
});
