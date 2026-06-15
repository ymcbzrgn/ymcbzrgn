
## 2024-05-18 - [Missing rel="noopener noreferrer" in Markdown Links]
**Vulnerability:** External links generated from parsed Markdown in `MarkdownViewer` lacked `rel="noopener noreferrer"` and `target="_blank"`. Because they were rendered via `dangerouslySetInnerHTML`, users navigating to external sites could expose `window.opener` to the linked site.
**Learning:** Even when `DOMPurify` is used to allow `href`, `target`, and `rel` attributes, it does not automatically enforce secure link attributes. When parsing Markdown, one must ensure links get safe attributes, particularly when allowing users to provide or click external URLs.
**Prevention:** Use a custom `marked.Renderer` to override the `link` method and manually append `target="_blank" rel="noopener noreferrer"` for any URL starting with `http://`, `https://`, or `//` before parsing.
