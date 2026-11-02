/**
 * PDF.js loader
 * Ubuntu×XP Desktop Portfolio
 *
 * PDF.js is only needed once a PDF is opened on a desktop, so it is injected on first use instead of
 * being a render-blocking <script> in index.html. It comes from a CDN, and a CDN can be out of reach
 * (strict corporate networks, content blockers): the load gives up after a few seconds, and the viewer
 * then offers the PDF itself instead of spinning.
 */

// TypeScript declaration for PDF.js global
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const PDFJS_BASE_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build';
const GIVE_UP_AFTER_MS = 8000;

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
      const script = document.createElement('script');
      let settled = false;
      let timer = 0;
      const fail = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        script.remove();
        pdfjsPromise = null;
        reject(new Error('PDF.js library could not be loaded.'));
      };

      script.src = `${PDFJS_BASE_URL}/pdf.min.js`;
      script.async = true;
      script.onload = () => {
        if (!window.pdfjsLib) {
          fail();
          return;
        }
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE_URL}/pdf.worker.min.js`;
        resolve(window.pdfjsLib);
      };
      script.onerror = fail;
      timer = window.setTimeout(fail, GIVE_UP_AFTER_MS);
      document.head.appendChild(script);
    });
  }

  return pdfjsPromise;
}
