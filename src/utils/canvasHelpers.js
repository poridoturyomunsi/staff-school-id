/**
 * Canvas utility functions for photo and signature processing
 */

/**
 * Resizes any image to a maximum width to compress file size for local storage.
 * @param {string} imageSrc - Base64 data URI or URL
 * @param {number} maxWidth - Maximum width in pixels
 * @param {string} format - 'image/jpeg' or 'image/png'
 * @param {number} quality - Compression quality (0 to 1)
 * @returns {Promise<string>} - Base64 data URI of the resized image
 */
export function resizeImage(imageSrc, maxWidth = 300, format = 'image/jpeg', quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = Math.round((maxWidth / w) * h);
        w = maxWidth;
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL(format, quality));
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
}

/**
 * Adjusts brightness, contrast, and applies background keying to a photo.
 * Resizes the image to a maximum width of 400px to optimize storage size.
 * @param {string} imageSrc - Base64 data URI of the source image
 * @param {number} brightness - Range from -100 to 100
 * @param {number} contrast - Range from -100 to 100
 * @param {boolean} removeBg - Whether to replace the background with white
 * @param {number} bgTolerance - Color matching tolerance (0-255)
 * @returns {Promise<string>} - Base64 data URI of the processed image
 */
export function processPhoto(imageSrc, brightness = 0, contrast = 0, removeBg = false, bgTolerance = 30) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Target aspect ratio: 3:4 (0.75) for standard portrait/passport photo
      const targetAspect = 3 / 4;
      const currentAspect = img.width / img.height;
      
      let cropX = 0;
      let cropY = 0;
      let cropW = img.width;
      let cropH = img.height;
      
      if (currentAspect > targetAspect) {
        // Wider than 3:4 (landscape or square)
        cropW = img.height * targetAspect;
        cropX = (img.width - cropW) / 2;
      } else if (currentAspect < targetAspect) {
        // Taller than 3:4
        cropH = img.width / targetAspect;
        cropY = (img.height - cropH) / 2;
      }

      // Compact target dimensions for IndexedDB optimization (3:4 ratio)
      const canvasW = 300;
      const canvasH = 400;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = canvasW;
      canvas.height = canvasH;
      
      // Perform automatic crop and center drawing
      ctx.drawImage(
        img,
        cropX, cropY, cropW, cropH,
        0, 0, canvasW, canvasH
      );

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 1. Auto-detect background color from corners if we need background removal
      // We sample the 4 corners and average them
      let bgR = 255, bgG = 255, bgB = 255;
      if (removeBg && data.length >= 16) {
        const corners = [
          { r: data[0], g: data[1], b: data[2] }, // Top-Left
          { r: data[(canvas.width - 1) * 4], g: data[(canvas.width - 1) * 4 + 1], b: data[(canvas.width - 1) * 4 + 2] }, // Top-Right
          { r: data[data.length - canvas.width * 4], g: data[data.length - canvas.width * 4 + 1], b: data[data.length - canvas.width * 4 + 2] }, // Bottom-Left
          { r: data[data.length - 4], g: data[data.length - 3], b: data[data.length - 2] } // Bottom-Right
        ];
        // Average corner colors
        bgR = Math.round(corners.reduce((sum, c) => sum + c.r, 0) / 4);
        bgG = Math.round(corners.reduce((sum, c) => sum + c.g, 0) / 4);
        bgB = Math.round(corners.reduce((sum, c) => sum + c.b, 0) / 4);
      }

      // Apply brightness, contrast, and bg removal
      // Brightness: factor from 0.5 to 1.5
      const bFactor = 1 + (brightness / 100);
      // Contrast: factor
      const cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Apply background removal (replace background color with white)
        if (removeBg) {
          const dist = Math.sqrt(
            Math.pow(r - bgR, 2) +
            Math.pow(g - bgG, 2) +
            Math.pow(b - bgB, 2)
          );
          if (dist < bgTolerance) {
            // Match! Replace with pure white
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            continue;
          }
        }

        // Apply brightness
        r = r * bFactor;
        g = g * bFactor;
        b = b * bFactor;

        // Apply contrast
        r = cFactor * (r - 128) + 128;
        g = cFactor * (g - 128) + 128;
        b = cFactor * (b - 128) + 128;

        // Clamp values
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.85)); // 0.85 quality is great and saves space
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
}

/**
 * Converts a signature image (typically black/blue ink on white paper) to transparent PNG
 * Resizes the image to a maximum width of 300px to optimize storage size.
 * @param {string} imageSrc - Base64 data URI of the signature
 * @param {number} threshold - Luminance threshold (0-255). Pixels above this are made transparent.
 * @returns {Promise<string>} - Base64 transparent PNG data URI
 */
export function makeSignatureTransparent(imageSrc, threshold = 200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Compress/Resize to maximum width of 300px
      const maxW = 300;
      let w = img.width;
      let h = img.height;
      if (w > maxW) {
        h = Math.round((maxW / w) * h);
        w = maxW;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Calculate luminance
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        // If luminance is high (white or light grey), make it transparent
        if (luminance > threshold) {
          data[i + 3] = 0; // Alpha = 0 (Transparent)
        } else {
          // Keep it, but can force ink color to be dark grey/black/blue for clarity
          // Let's keep original ink but boost contrast (make it fully opaque)
          data[i + 3] = 255;
          // Optionally, darken signature lines:
          const darkenFactor = 0.6;
          data[i] = Math.round(r * darkenFactor);
          data[i + 1] = Math.round(g * darkenFactor);
          data[i + 2] = Math.round(b * darkenFactor);
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
}
