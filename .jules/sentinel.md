## 2024-05-25 - Protocol-Relative URL Bypass and `javascript:` Injection
**Vulnerability:** External untrusted websites (`//evil.com`) could bypass `startsWith("/")` checks and be rendered in iframes, and `javascript:` URLs could be rendered unescaped in properties links.
**Learning:** `startsWith("/")` is not sufficient to restrict to same-origin paths, because `//` signifies a protocol-relative URL to the browser, resolving to an external origin if used.
**Prevention:** Check that the string `startsWith("/") && !startsWith("//")` to ensure it is strictly a path. For `href` links driven by user input, validate schemes against `javascript:` and `data:`.
