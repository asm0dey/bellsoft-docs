#!/usr/bin/env python3
"""Refresh src/data/container-tags.json from Docker Hub.

Fetches every tag of bellsoft/liberica-runtime-container via the registry v2
tags/list endpoint, parses them into the dimensions the tag-picker widget
needs, and writes a compact JSON file (dimension lists + the set of real,
pullable bare-major tags used to validate a chosen combination).

Run from the repo root:  python3 scripts/fetch-container-tags.py
"""
import json
import re
import urllib.request
from pathlib import Path

REPO = "bellsoft/liberica-runtime-container"
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "container-tags.json"

TYPES = ["jdk-all", "jre-all", "jdk", "jre"]  # longest match first
FLAGS = ["crac", "cds", "slim", "stream"]
LIBC = ["glibc", "musl"]
BARE_MAJOR = re.compile(r"^\d+$")
VERSION_TOKEN = re.compile(r"^\d+(\.\d+)*(_\d+)*$")


def fetch_tags() -> list[str]:
    token_url = (
        "https://auth.docker.io/token?service=registry.docker.io"
        f"&scope=repository:{REPO}:pull"
    )
    token = json.load(urllib.request.urlopen(token_url))["token"]
    req = urllib.request.Request(
        f"https://registry-1.docker.io/v2/{REPO}/tags/list",
        headers={"Authorization": f"Bearer {token}"},
    )
    return json.load(urllib.request.urlopen(req))["tags"]


def main() -> None:
    tags = fetch_tags()
    image_types, majors, libcs, flagset, canonical = set(), set(), set(), set(), set()
    for tag in tags:
        typ = next((t for t in TYPES if tag == t or tag.startswith(t + "-")), None)
        if not typ:
            continue
        version = None
        flags = set()
        libc = None
        for tok in (x for x in tag[len(typ):].split("-") if x):
            if tok in FLAGS:
                flags.add(tok)
            elif tok in LIBC:
                libc = tok
            elif VERSION_TOKEN.match(tok):
                version = tok
        image_types.add(typ)
        if version and BARE_MAJOR.match(version):  # keep bare-major tags only
            majors.add(version)
            if libc:
                libcs.add(libc)
            flagset.update(flags)
            canonical.add(tag)

    data = {
        "repo": REPO,
        "fetchedCount": len(tags),
        "imageTypes": [t for t in TYPES if t in image_types],
        "javaVersions": sorted(majors, key=int, reverse=True),
        "libc": [l for l in LIBC if l in libcs],
        "flags": [f for f in FLAGS if f in flagset],
        "canonicalTags": sorted(canonical),
    }
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    print(f"wrote {OUT} — {len(data['canonicalTags'])} tags, {OUT.stat().st_size} bytes")


if __name__ == "__main__":
    main()
