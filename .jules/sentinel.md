## 2024-05-11 - [Protocol-Relative URL & Javascript URI XSS]
**Vulnerability:** A protocol-relative URL (`//evil.com`) bypassed the `startsWith("/")` same-origin check, and the fallback button could execute `javascript:` URIs.
**Learning:** `startsWith("/")` is insufficient to verify safe local paths without explicitly blocking protocol-relative variants (`//`). Direct invocation of `window.open` with user-controlled data can lead to XSS.
**Prevention:** Always validate that URLs don’t start with `//` or `javascript:` before opening them in a new window or rendering them in an iframe.
