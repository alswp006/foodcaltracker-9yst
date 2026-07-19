import type { StorageResult } from "@/lib/types";

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

export function safeGet<T>(key: string, fallback: T): T {
  throw new Error("Not implemented");
}

export function safeSet<T>(key: string, value: T): StorageResult {
  throw new Error("Not implemented");
}

export function removeKey(key: string): void {
  throw new Error("Not implemented");
}

export function clearAll(): void {
  throw new Error("Not implemented");
}
