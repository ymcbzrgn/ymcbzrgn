## 2024-05-18 - Memory leak and unexpected global state modification via DOMPurify hooks
**Vulnerability:** Adding DOMPurify hooks (e.g. `DOMPurify.addHook`) dynamically within a React component's rendering cycle or effects without properly removing them afterwards causes hooks to accumulate, which acts as a memory leak, and affects all subsequent DOMPurify usages globally across the application.
**Learning:** DOMPurify hooks modify a singleton global state of the library. They are not isolated to the component where they are declared.
**Prevention:** Always pair `DOMPurify.addHook` with `DOMPurify.removeHook` when you use it inside functions or components.
