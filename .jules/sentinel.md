
## 2024-05-24 - [Secure Link Attributes in MarkdownViewer]
**Vulnerability:** The Markdown viewer was rendering external links without `target="_blank"` and `rel="noopener noreferrer"`.
**Learning:** Using global DOMPurify hooks to add these attributes can cause race conditions or conflict with other parts of the application. The safer approach is to apply link transformations localized to the parser or renderer (like `marked.Renderer`) instead of the global sanitizer. Furthermore, when creating custom renderers, it's vital to call the original renderer method (`originalLink`) first to ensure inputs are safely HTML-escaped by the underlying library to prevent XSS.
**Prevention:** Handle HTML transformations (like securing external links) using a localized parser/renderer such as `marked.Renderer`, and avoid dynamically mutating global singletons like DOMPurify hooks inside React components.
