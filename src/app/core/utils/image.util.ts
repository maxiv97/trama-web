const MAX_DIMENSION = 1280;
const QUALITY = 0.8;

export function compressImage(file: File, maxDimension = MAX_DIMENSION, quality = QUALITY): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const largerSide = Math.max(img.naturalHeight, img.naturalWidth);
      const ratio = largerSide > maxDimension ? (maxDimension / largerSide) : 1;
      const newWidth = Math.round(img.naturalWidth * ratio);
      const newHeight = Math.round(img.naturalHeight * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const canvasPlainContext = canvas.getContext('2d');

      if (!canvasPlainContext) {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo obtener el contexto 2D'));
        return;
      }

      canvasPlainContext.drawImage(img, 0, 0, newWidth, newHeight);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      URL.revokeObjectURL(url);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen'));
    };

    img.src = url;
  });
}
