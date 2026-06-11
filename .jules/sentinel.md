## 2024-05-18 - [Secure External Links in Markdown Viewer]
**Vulnerability:** External links rendered in the Markdown Viewer lacked `target="_blank"` and `rel="noopener noreferrer"`, exposing users to potential reverse tabnabbing attacks where the external site could modify the original page.
**Learning:** Using `marked`'s custom renderer is a safer and more localized approach than modifying global singletons like `DOMPurify.addHook()`, which could cause race conditions or affect other components globally.
**Prevention:** Always enforce secure attributes (`rel="noopener noreferrer"`) for external links during markdown rendering or HTML generation, using localized parsers rather than global sanitization hooks.
