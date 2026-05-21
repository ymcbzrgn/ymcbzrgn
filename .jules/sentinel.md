## 2024-05-21 - Reverse Tabnabbing Vulnerability
**Vulnerability:** Found a `window.open` call with `_blank` target but without `noopener,noreferrer` attributes.
**Learning:** `window.open` calls without `noopener,noreferrer` can expose a `window.opener` reference, leading to a reverse tabnabbing vulnerability where a newly opened tab can manipulate the original tab.
**Prevention:** Always include `noopener,noreferrer` when using `window.open` with a `_blank` target.
