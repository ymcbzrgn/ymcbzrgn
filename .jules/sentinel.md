## 2025-06-12 - [Secure External Links in Markdown]
**Vulnerability:** Reverse tabnabbing vulnerability where external links in markdown are missing `target="_blank"` and `rel="noopener noreferrer"`.
**Learning:** Adding security rules (like `rel="noopener noreferrer"`) via global singletons (like `DOMPurify.addHook`) can cause race conditions and interfere with other global hooks in a multi-component environment.
**Prevention:** Handle HTML transformations for external links using a localized, custom `marked.Renderer` so that the scope is limited to the specific markdown component rendering the content.
