// Las fotos se guardan como data URLs dentro del documento de la prenda, y un
// documento de MongoDB no puede superar los 16 MB. Redimensionar y recomprimir
// cada imagen antes de convertirla evita que las fotos de cámara (varios MB
// cada una) hagan que el documento sea demasiado grande para insertarlo.
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.8;

export function compressImage(
  file: File,
  maxDimension = MAX_DIMENSION,
  quality = JPEG_QUALITY,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
      image.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('No se pudo procesar la imagen'));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
