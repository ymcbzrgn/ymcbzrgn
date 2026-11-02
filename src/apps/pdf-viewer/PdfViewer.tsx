/**
 * PDF Viewer App
 * Ubuntu×XP Desktop Portfolio
 *
 * Displays PDF files using PDF.js
 */

import { useEffect, useRef, useState } from 'react';
import type { PdfViewerProps } from '../types';
import { useT } from '../../os/i18n/full';
import { useIsMobile } from '../../os/hooks/useDeviceType';
import { loadPdfJs } from './loadPdfJs';
import './PdfViewer.css';

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.25;

/** The PDF itself: open it in the device's own viewer or save it. Needs no script, so it always works. */
function PdfFileActions({ fileUrl }: { fileUrl: string }) {
  const t = useT();
  return (
    <div className="pdf-actions">
      <a className="pdf-actions__btn pdf-actions__btn--primary" href={fileUrl} target="_blank" rel="noopener noreferrer">
        {t('pdfOpen')}
      </a>
      <a className="pdf-actions__btn" href={fileUrl} download>
        {t('pdfDownload')}
      </a>
    </div>
  );
}

export default function PdfViewer({ fileUrl }: PdfViewerProps) {
  const t = useT();
  const isMobile = useIsMobile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  // Load PDF document (not on a phone: the device's own viewer does that better)
  useEffect(() => {
    if (isMobile) return;
    const loadPdf = async () => {
      // Validate fileUrl
      if (!fileUrl || fileUrl.trim() === '') {
        setError('No PDF file provided. Please select a PDF file.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // PDF.js is loaded on demand (first PDF opened), not with the page
        const pdfjsLib = await loadPdfJs();
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdfDocument = await loadingTask.promise;

        setPdf(pdfDocument);
        setTotalPages(pdfDocument.numPages);
        setLoading(false);
      } catch (err) {
        setError(`${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    loadPdf();
  }, [fileUrl, isMobile]);

  // Render current page
  useEffect(() => {
    if (!pdf || !canvasRef.current || rendering) return;

    const renderPage = async () => {
      setRendering(true);

      try {
        const page = await pdf.getPage(currentPage);
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        // Calculate viewport
        const viewport = page.getViewport({ scale });

        // High-DPI canvas rendering (Retina support)
        const outputScale = window.devicePixelRatio || 1;

        // Set internal canvas resolution (high-DPI)
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);

        // Set CSS display size (actual size)
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        // Apply transform for high-DPI rendering
        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

        // Render page
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          transform: transform,
        };

        await page.render(renderContext).promise;
        setRendering(false);
      } catch (err) {
        setError(`Failed to render page: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setRendering(false);
      }
    };

    renderPage();
  }, [pdf, currentPage, scale]);

  // Zoom controls
  const zoomIn = () => {
    setScale((prev) => Math.min(prev + SCALE_STEP, MAX_SCALE));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - SCALE_STEP, MIN_SCALE));
  };

  const resetZoom = () => {
    setScale(1.0);
  };

  const fitToWidth = () => {
    if (!canvasRef.current || !containerRef.current || !pdf) return;

    // Get container width minus padding
    const containerWidth = containerRef.current.clientWidth - 40; // 20px padding each side

    // Get page to calculate its original width
    pdf.getPage(currentPage).then((page: any) => {
      const viewport = page.getViewport({ scale: 1.0 });
      const pageWidth = viewport.width;

      // Calculate scale to fit width
      const newScale = containerWidth / pageWidth;
      setScale(Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE));
    });
  };

  // Page navigation
  const prevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const goToPage = (pageNum: number) => {
    const validPage = Math.max(1, Math.min(pageNum, totalPages));
    setCurrentPage(validPage);
  };

  // Phone: a file card. One tap opens the PDF in the device's viewer (zoom, search, share and save included).
  if (isMobile && fileUrl) {
    return (
      <div className="pdf-error pdf-card">
        <div className="pdf-error__icon">📄</div>
        <h3>{fileUrl.split('/').pop()}</h3>
        <p>{t('pdfNativeNote')}</p>
        <PdfFileActions fileUrl={fileUrl} />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="pdf-loading">
        <div className="pdf-loading__spinner" />
        <p>{t('pdfLoading')}</p>
      </div>
    );
  }

  // The in-page viewer did not load (a CDN that is out of reach, a blocker...): the PDF itself still opens.
  if (error) {
    return (
      <div className="pdf-error">
        <div className="pdf-error__icon">📄</div>
        <h3>{t('pdfFallbackTitle')}</h3>
        <p>{t('pdfFallbackNote')}</p>
        {fileUrl && <PdfFileActions fileUrl={fileUrl} />}
        <button onClick={() => window.location.reload()}>{t('pdfReload')}</button>
      </div>
    );
  }

  return (
    <div className="pdf-viewer">
      {/* Toolbar */}
      <div className="pdf-toolbar">
        {/* Page Navigation */}
        <div className="pdf-toolbar__section">
          <button
            className="pdf-toolbar__button"
            onClick={prevPage}
            disabled={currentPage === 1}
            title="Previous page"
          >
            ←
          </button>
          <div className="pdf-toolbar__page-info">
            <input
              type="number"
              className="pdf-toolbar__page-input"
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              min={1}
              max={totalPages}
            />
            <span className="pdf-toolbar__page-total">/ {totalPages}</span>
          </div>
          <button
            className="pdf-toolbar__button"
            onClick={nextPage}
            disabled={currentPage === totalPages}
            title="Next page"
          >
            →
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="pdf-toolbar__section">
          <button
            className="pdf-toolbar__button"
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            title="Zoom out"
          >
            −
          </button>
          <span className="pdf-toolbar__zoom-level">{Math.round(scale * 100)}%</span>
          <button
            className="pdf-toolbar__button"
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            title="Zoom in"
          >
            +
          </button>
          <button className="pdf-toolbar__button" onClick={resetZoom} title="Reset zoom">
            100%
          </button>
          <button className="pdf-toolbar__button" onClick={fitToWidth} title="Fit to width">
            ⇔
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="pdf-canvas-container" ref={containerRef}>
        <canvas ref={canvasRef} className="pdf-canvas" />
        {rendering && (
          <div className="pdf-rendering-overlay">
            <div className="pdf-rendering-spinner" />
          </div>
        )}
      </div>
    </div>
  );
}
