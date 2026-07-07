// Kompresja i zmniejszenie zdjęcia w przeglądarce PRZED wysłaniem.
// Mniejsze pliki = dużo mniejszy transfer (egress) przy każdym wyświetleniu strony,
// co jest kluczowe, żeby zmieścić się w limitach darmowego planu Convex.
export async function compressImage(
  file: File,
  maxDim = 1600,
  quality = 0.82,
): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    let width = bitmap.width;
    let height = bitmap.height;
    const longest = Math.max(width, height);
    if (longest > maxDim) {
      const scale = maxDim / longest;
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", quality),
    );
    // Użyj skompresowanego tylko jeśli faktycznie mniejszy.
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}
