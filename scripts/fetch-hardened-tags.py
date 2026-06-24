#!/usr/bin/env python3
"""Refresh hardened-image tag data from Docker Hub.

Fetches every tag of each bellsoft/hardened-* repository, parses each tag into
structured facets (libc, variant, flags, version major, image type), and writes:

  - src/data/hardened-tags.json      small index: per-repo facet value lists
  - public/hardened-tags/<key>.json  full parsed entries, fetched on demand

The picker filters the real, pullable entries by the chosen facets, so it can
only ever show tags that actually exist. Run from the repo root:

    python3 scripts/fetch-hardened-tags.py
"""
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "src" / "data" / "hardened-tags.json"
PER_REPO_DIR = ROOT / "public" / "hardened-tags"

# key -> (docker repo, display label, language family)
REPOS = {
    "hardened-base": ("bellsoft/hardened-base", "Alpaquita Base"),
    "hardened-gcc": ("bellsoft/hardened-gcc", "GCC (C/C++)"),
    "hardened-go": ("bellsoft/hardened-go", "Go"),
    "hardened-nodejs": ("bellsoft/hardened-nodejs", "Node.js"),
    "hardened-python": ("bellsoft/hardened-python", "Python"),
    "hardened-liberica-runtime-container": ("bellsoft/hardened-liberica-runtime-container", "Liberica JDK"),
    "hardened-liberica-native-image-kit-container": ("bellsoft/hardened-liberica-native-image-kit-container", "Liberica NIK"),
}

TYPES = ["jdk-all", "jre-all", "jdk", "jre"]  # longest match first
VARIANTS = ["nonroot", "distroless"]          # absent => "standard"
FLAGS = ["cds", "crac", "debug", "slim", "stream"]
LIBC = ["glibc", "musl"]
VERSION_TOKEN = re.compile(r"^\d+(\.\d+)*$")


def fetch_tags(repo: str) -> list[str]:
    token_url = (
        "https://auth.docker.io/token?service=registry.docker.io"
        f"&scope=repository:{repo}:pull"
    )
    token = json.load(urllib.request.urlopen(token_url, timeout=30))["token"]
    req = urllib.request.Request(
        f"https://registry-1.docker.io/v2/{repo}/tags/list",
        headers={"Authorization": f"Bearer {token}"},
    )
    return json.load(urllib.request.urlopen(req, timeout=30))["tags"]


def parse_tag(tag: str) -> dict:
    """Split a tag into structured facets. Unknown tokens are ignored."""
    rest = tag
    typ = next((t for t in TYPES if tag == t or tag.startswith(t + "-")), None)
    if typ:
        rest = tag[len(typ):]
    toks = [x for x in rest.split("-") if x]
    libc = None
    variant = "standard"
    flags = []
    versions = []
    has_nik = False
    for tok in toks:
        if tok in LIBC:
            libc = tok
        elif tok in VARIANTS:
            variant = tok
        elif tok in FLAGS:
            flags.append(tok)
        elif tok == "nik":
            has_nik = True
        elif VERSION_TOKEN.match(tok):
            versions.append(tok)
    # For NIK tags (jdk-<java>-nik-<nikver>-...), the first version is the Java
    # line and the second is the NIK line. Otherwise the first is the product version.
    version = versions[0] if versions else None
    nik_version = versions[1] if (has_nik and len(versions) > 1) else None
    return {
        "tag": tag,
        "type": typ,
        "libc": libc,
        "variant": variant,
        "flags": sorted(flags),
        "version": version,
        "nikVersion": nik_version,
    }


def _vkey(v: str):
    return [int(p) if p.isdigit() else p for p in re.split(r"[.]", v)]


def facets(entries: list[dict]) -> dict:
    def vals(key):
        s = {e[key] for e in entries if e.get(key)}
        return s
    versions = sorted(vals("version"), key=_vkey, reverse=True)
    return {
        "type": [t for t in TYPES if t in vals("type")],
        "variant": ["standard"] + [v for v in VARIANTS if v in vals("variant")],
        "libc": [l for l in LIBC if l in vals("libc")],
        "flags": [f for f in FLAGS if f in {fl for e in entries for fl in e["flags"]}],
        "versions": versions,
    }


def main() -> None:
    PER_REPO_DIR.mkdir(parents=True, exist_ok=True)
    index_repos = []
    for key, (repo, label) in REPOS.items():
        tags = fetch_tags(repo)
        entries = sorted((parse_tag(t) for t in tags), key=lambda e: e["tag"])
        fc = facets(entries)
        (PER_REPO_DIR / f"{key}.json").write_text(
            json.dumps({"repo": repo, "entries": entries, "facets": fc}, separators=(",", ":"))
        )
        index_repos.append({"key": key, "repo": repo, "label": label, "facets": fc, "count": len(entries)})
        print(f"  {key}: {len(tags)} tags -> {key}.json")
    INDEX.write_text(json.dumps({"repos": index_repos}, separators=(",", ":")))
    print(f"wrote {INDEX} ({INDEX.stat().st_size} bytes) and {len(REPOS)} per-repo files")


if __name__ == "__main__":
    main()
