#!/usr/bin/env python3
"""
Tidies the CV PDF that Canva exports, without touching what it looks like:

  * document properties: a real Title / Author / Subject / Keywords (Canva writes the file name and
    internal ids), shown by PDF viewers and by search engines as the result title
  * the website link: Canva keeps the old http://www.yamacbezirgan.com/ (www has no DNS record, so
    clicking it in the CV goes nowhere); it becomes https://yamacbezirgan.com/

Run it again after every new export from Canva:

    pip install pypdf
    python3 scripts/seo/fix-cv-pdf.py            # fixes public/YAMAC_BEZIRGAN_CURRENT_CV.pdf in place
    python3 scripts/seo/fix-cv-pdf.py in.pdf out.pdf
"""
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import BooleanObject, DictionaryObject, NameObject, TextStringObject

ROOT = Path(__file__).resolve().parents[2]
DEFAULT = ROOT / "public" / "YAMAC_BEZIRGAN_CURRENT_CV.pdf"

TITLE = "Yamaç Bezirgan – CV (Software Engineer)"
AUTHOR = "Yamaç Bezirgan"
SUBJECT = "Software Engineer focused on AI platforms, backend architecture and full-stack products: experience, projects, education and skills."
KEYWORDS = (
    "Yamaç Bezirgan, Yamac Bezirgan, software engineer, yazılım mühendisi, AI, LLM, RAG, backend, "
    "full-stack, Python, TypeScript, React, Node.js, CV, resume, özgeçmiş"
)
DEAD_TO_LIVE = {
    "http://www.yamacbezirgan.com/": "https://yamacbezirgan.com/",
    "http://www.yamacbezirgan.com": "https://yamacbezirgan.com/",
    "https://www.yamacbezirgan.com/": "https://yamacbezirgan.com/",
    "https://www.yamacbezirgan.com": "https://yamacbezirgan.com/",
}


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else src
    reader = PdfReader(str(src))
    writer = PdfWriter(clone_from=reader)

    fixed = 0
    for page in writer.pages:
        for ref in page.get("/Annots") or []:
            action = ref.get_object().get("/A")
            if not action:
                continue
            action = action.get_object()
            uri = str(action.get("/URI", ""))
            if uri in DEAD_TO_LIVE:
                action[NameObject("/URI")] = TextStringObject(DEAD_TO_LIVE[uri])
                fixed += 1

    # the accessibility tree (the PDF is tagged) repeats each link as alternate text for screen readers
    for obj in getattr(writer, "_objects", []):  # noqa: SLF001
        try:
            node = obj.get_object() if hasattr(obj, "get_object") else obj
            if isinstance(node, DictionaryObject) and "/Alt" in node and str(node["/Alt"]) in DEAD_TO_LIVE:
                node[NameObject("/Alt")] = TextStringObject(DEAD_TO_LIVE[str(node["/Alt"])])
                fixed += 1
        except Exception:  # an odd object must not stop the fix
            continue

    writer.add_metadata(
        {
            "/Title": TITLE,
            "/Author": AUTHOR,
            "/Subject": SUBJECT,
            "/Keywords": KEYWORDS,
        }
    )
    # Canva's XMP block would still carry the old title; the document info above is the one we mean
    root = writer._root_object  # noqa: SLF001 (pypdf has no public API for this)
    if "/Metadata" in root:
        del root["/Metadata"]
    # viewers (and browser tabs) show the title instead of the file name
    prefs = root.get("/ViewerPreferences")
    prefs = prefs.get_object() if prefs else DictionaryObject()
    prefs[NameObject("/DisplayDocTitle")] = BooleanObject(True)
    root[NameObject("/ViewerPreferences")] = prefs

    with open(dst, "wb") as fh:
        writer.write(fh)
    print(f"{dst}: {fixed} link(s) fixed, properties set")


if __name__ == "__main__":
    main()
