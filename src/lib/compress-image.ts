const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_DIMENSION = 1920;

export async function compressIfNeeded(file: File): Promise<File> {
  if (file.size <= MAX_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Start at quality 0.85 and step down until under the limit
  let quality = 0.85;
  let blob: Blob;
  do {
    blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", quality)
    );
    quality -= 0.1;
  } while (blob.size > MAX_BYTES && quality > 0.1);

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
  });
}
