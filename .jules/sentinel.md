## 2024-05-18 - [Markdown Target Blank]
**Vulnerability:** External links rendered in markdown with `target="_blank"` missing `rel="noopener noreferrer"`.
**Learning:** This is a classic "Reverse Tabnabbing" vulnerability where the newly opened page can access the original page's `window.opener` and navigate it to a malicious site. DOMPurify hooks should be avoided in React due to global state, instead `marked.Renderer` is better.
**Prevention:** Enforce `rel="noopener noreferrer"` for any `target="_blank"` link in markdown rendering.
