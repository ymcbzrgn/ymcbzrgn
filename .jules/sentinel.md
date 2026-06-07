
## 2024-05-30 - Localized Renderers for Link Attributes
**Vulnerability:** External links in MarkdownViewer were not opening with `target="_blank" rel="noopener noreferrer"`, which poses a security/navigational risk (Tabnabbing).
**Learning:** Using global DOMPurify hooks to rewrite HTML elements in React components is prone to race conditions and conflict with other parts of the system.
**Prevention:** Instead of adding global DOMPurify hooks, it is safer to handle such transformations (e.g., adding secure attributes to external links) locally in the specific parser/renderer, like overriding `marked.Renderer` methods and using `marked.Renderer.prototype.link.call(renderer, ...)` to safely generate the HTML before adding specific link attributes based on `href` prefixes (`http://`, `https://`, `//`).
