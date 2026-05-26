## 2024-05-26 - [Reverse Tabnabbing in MarkdownViewer]
**Vulnerability:** Reverse Tabnabbing (target="_blank" without rel="noopener noreferrer") in Markdown rendering
**Learning:** DOMPurify sanitizes the payload but by default allows target="_blank" without appending rel="noopener noreferrer". This can lead to a reverse tabnabbing attack where the newly opened window could manipulate the parent window's location via window.opener.
**Prevention:** Use DOMPurify's `addHook` API for `afterSanitizeAttributes` to forcibly set `rel="noopener noreferrer"` on all `<a>` tags with `target="_blank"`.
