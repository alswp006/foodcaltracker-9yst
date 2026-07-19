// Image resize utility — downscale to max 1280px, JPEG quality 0.7, base64 output.

const MAX_DIMENSION = 1280;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const JPEG_QUALITY = 0.7;
const JPEG_MIME = "image/jpeg";

export type ResizeImageResult =
  | { ok: true; base64: string; error?: undefined }
  | { ok: false; error: string; base64?: undefined };

function hasImageSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  // JPEG: FF D8 FF ; PNG: 89 50 4E 47
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  return false;
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"));
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), JPEG_MIME, JPEG_QUALITY);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("READ_FAILED"));
    reader.readAsDataURL(blob);
  });
}

function readHeaderBytes(file: File, byteCount: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer).slice(0, byteCount));
    reader.onerror = () => reject(new Error("READ_FAILED"));
    reader.readAsArrayBuffer(file.slice(0, byteCount));
  });
}

export async function resizeImage(file: File): Promise<ResizeImageResult> {
  let objectUrl: string | null = null;
  let canvas: HTMLCanvasElement | null = null;

  try {
    if (file.size === 0) {
      return { ok: false, error: "INVALID_IMAGE" };
    }

    const header = await readHeaderBytes(file, 4);
    if (!hasImageSignature(header)) {
      return { ok: false, error: "INVALID_IMAGE" };
    }

    objectUrl = URL.createObjectURL(file);
    const img = await loadImageElement(objectUrl);

    const sourceWidth = img.naturalWidth || 1;
    const sourceHeight = img.naturalHeight || 1;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { ok: false, error: "CANVAS_UNAVAILABLE" };
    }
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const blob = await canvasToBlob(canvas);
    if (!blob) {
      return { ok: false, error: "ENCODE_FAILED" };
    }
    if (blob.size > MAX_OUTPUT_BYTES) {
      return { ok: false, error: "TOO_LARGE" };
    }

    const base64 = await blobToBase64(blob);
    return { ok: true, base64, error: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "IMAGE_DECODE_FAILED";
    return { ok: false, error: message };
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
