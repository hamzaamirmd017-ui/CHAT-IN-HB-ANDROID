/**
 * Utility to compress images in browser before saving as base64 in Firestore documents.
 * Ensures the document stays well below Firestore's 1MB (1,048,576 bytes) document limit.
 */

export const compressImageFile = (
  file: File,
  maxWidth = 1080,
  maxHeight = 1080,
  quality = 0.75
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If not an image, resolve standard reader result
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale down dimensions if greater than maxWidth/maxHeight
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // If string is still > 600,000 chars (~450KB binary), compress further
        if (dataUrl.length > 600000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.55);
        }

        if (dataUrl.length > 600000) {
          // Resize dimensions by 0.7x
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = Math.round(width * 0.7);
          smallCanvas.height = Math.round(height * 0.7);
          const smallCtx = smallCanvas.getContext('2d');
          if (smallCtx) {
            smallCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);
            dataUrl = smallCanvas.toDataURL('image/jpeg', 0.5);
          }
        }

        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};
