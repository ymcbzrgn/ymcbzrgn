
## 2024-06-08 - [Secure External Links in Markdown]
**Vulnerability:** External links generated from markdown (via `marked`) were lacking `target="_blank"` and `rel="noopener noreferrer"` attributes.
**Learning:** We need to enforce secure link attributes without introducing side-effects. DOMPurify `addHook` is discouraged because it mutates global state, potentially removing other hooks due to race conditions or overwriting.
**Prevention:** Override the localized parser/renderer (e.g. `marked.Renderer`) to process link attributes securely instead of relying on global DOMPurify hooks. Ensure that only external links (e.g. starting with `http://`, `https://`, or `//`) are targeted to avoid breaking internal anchor links.
