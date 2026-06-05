## 2026-06-04 - [Reverse Tabnabbing in MarkdownViewer]
**Vulnerability:** External links rendered in the MarkdownViewer component were missing `target="_blank"` and `rel="noopener noreferrer"` attributes, opening the application to Reverse Tabnabbing attacks where newly opened tabs could hijack the `window.opener` object.
**Learning:** `marked` does not automatically enforce secure target attributes on links. It requires custom renderer overrides.
**Prevention:** Always verify that markdown renderers or HTML sanitizers explicitly inject `target="_blank"` and `rel="noopener noreferrer"` for external links.
