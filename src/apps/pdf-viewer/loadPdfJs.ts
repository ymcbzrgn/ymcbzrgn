/**
 * PDF.js loader
 * Ubuntu×XP Desktop Portfolio
 *
 * PDF.js is only needed once a PDF is opened, so it is injected on first use
 * instead of being a render-blocking <script> in index.html.
 */

// TypeScript declaration for PDF.js global
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const PDFJS_BASE_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build';

let pdfjsPromise: Promise<Window['pdfjsLib']> | null = null;

/**
 * Load PDF.js once and resolve with the global `pdfjsLib`.
 * A failed load is not cached, so opening another PDF retries.
 */
export function loadPdfJs(): Promise<Window['pdfjsLib']> {
  if (window.pdfjsLib) {
    return Promise.resolve(window.pdfjsLib);
  }

  if (!pdfjsPromise) {
    pdfjsPromise = new Promise((resolve, reject) => {
      const fail = (script: HTMLScriptElement) => {
        script.remove();
        pdfjsPromise = null;
        reject(new Error('PDF.js library could not be loaded. Check your connection and try again.'));
      };

      const script = document.createElement('script');
      script.src = `${PDFJS_BASE_URL}/pdf.min.js`;
      script.async = true;
      script.onload = () => {
        if (!window.pdfjsLib) {
          fail(script);
          return;
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE_URL}/pdf.worker.min.js`;
        resolve(window.pdfjsLib);
      };
      script.onerror = () => fail(script);
      document.head.appendChild(script);
    });
  }

  return pdfjsPromise;
}
