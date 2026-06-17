/**
 * MarkdownViewer Component
 * GitHub-style markdown renderer with XSS protection
 */

import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useVFSNodes } from '../../os/store';
import './MarkdownViewer.css';

interface MarkdownViewerProps {
  windowId: string;
  nodeId?: string;
}

export default function MarkdownViewer({ nodeId }: MarkdownViewerProps) {
  const nodes = useVFSNodes();
  const file = nodeId ? nodes[nodeId] : null;

  // Extract markdown content from data URL
  const markdownContent = useMemo(() => {
    if (!file?.targetUrl) return '';

    // Check if it's a data URL
    if (file.targetUrl.startsWith('data:')) {
      try {
        // Extract base64 data from data URL
        const base64Match = file.targetUrl.match(/base64,(.+)$/);
        if (base64Match) {
          const base64Data = base64Match[1];
          // Decode UTF-8 properly
          const decoded = decodeURIComponent(
            atob(base64Data)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          return decoded;
        }
      } catch (error) {
        console.error('Failed to decode markdown content:', error);
        return '**Error:** Could not decode file content';
      }
    }

    return '**External file** - content not available';
  }, [file?.targetUrl]);

  // Render markdown to sanitized HTML
  const htmlContent = useMemo(() => {
    if (!markdownContent) return '<p>No content</p>';

    try {
      // Configure marked with a secure renderer
      const renderer = new marked.Renderer();
      const originalLink = renderer.link.bind(renderer);

      renderer.link = function(href: string | { href: string }, title: string | null | undefined, text: string) {
        // Handle object token format (marked v11+)
        if (typeof href === 'object' && href !== null) {
          const token = href as { href: string, title?: string, text: string };
          let html = originalLink(token as any, null, '');
          const url = token.href;
          if (url && (url.toLowerCase().startsWith('http://') || url.toLowerCase().startsWith('https://') || url.startsWith('//'))) {
            html = html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ');
          }
          return html;
        }

        // Handle string format (older versions or explicit string calls)
        const urlString = href as string;
        let html = originalLink(urlString, title, text);
        if (urlString && (urlString.toLowerCase().startsWith('http://') || urlString.toLowerCase().startsWith('https://') || urlString.startsWith('//'))) {
          html = html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ');
        }
        return html;
      };

      // Parse markdown to HTML
      const rawHtml = marked(markdownContent, {
        breaks: true,
        gfm: true, // GitHub Flavored Markdown
        renderer,
      });

      // Sanitize HTML to prevent XSS
      const sanitized = DOMPurify.sanitize(rawHtml as string, {
        ALLOWED_TAGS: [
          'p',
          'a',
          'ul',
          'ol',
          'li',
          'code',
          'pre',
          'strong',
          'em',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'blockquote',
          'br',
          'hr',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
          'del',
          'ins',
        ],
        ALLOWED_ATTR: ['href', 'class', 'target', 'rel'],
        ALLOW_DATA_ATTR: false,
      });

      return sanitized;
    } catch (error) {
      console.error('Failed to render markdown:', error);
      return '<p><strong>Error:</strong> Failed to render markdown</p>';
    }
  }, [markdownContent]);

  return (
    <div className="markdown-viewer">
      {/* Toolbar */}
      <div className="markdown-viewer__toolbar">
        <span className="markdown-viewer__toolbar-icon">📝</span>
        <span className="markdown-viewer__toolbar-title">{file?.name || 'Markdown File'}</span>
      </div>

      {/* Content */}
      <div
        className="markdown-viewer__content"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
