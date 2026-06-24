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
ROOT = Path(__file__).resolve().parent.parent
# Small index (dimensions + version lists) imported into the widget at build:
INDEX = ROOT / "src" / "data" / "container-tags.json"
# One file per major Java line, served statically and fetched on demand so the
# page stays light — each holds that line's full set of real, pullable tags:
PER_MAJOR_DIR = ROOT / "public" / "container-tags"

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


def version_sort_key(v: str):
    # "21.0.6_10" -> (21, 0, 6, 10); bare "21" sorts before its minors.
    return [int(p) for p in re.split(r"[._]", v)]


def main() -> None:
    tags = fetch_tags()
    image_types, libcs, flagset = set(), set(), set()
    versions_by_major: dict[str, set] = {}
    tags_by_major: dict[str, set] = {}
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
        if not version:
            continue
        major = re.split(r"[._]", version)[0]
        versions_by_major.setdefault(major, set()).add(version)
        tags_by_major.setdefault(major, set()).add(tag)
        if libc:
            libcs.add(libc)
        flagset.update(flags)

    majors = sorted(versions_by_major, key=int, reverse=True)
    index = {
        "repo": REPO,
        "fetchedCount": len(tags),
        "imageTypes": [t for t in TYPES if t in image_types],
        "javaVersions": majors,
        "versionsByMajor": {
            m: sorted(versions_by_major[m], key=version_sort_key) for m in majors
        },
        "libc": [l for l in LIBC if l in libcs],
        "flags": [f for f in FLAGS if f in flagset],
    }
    INDEX.write_text(json.dumps(index, separators=(",", ":")))
    print(f"wrote {INDEX} — index, {INDEX.stat().st_size} bytes")

    PER_MAJOR_DIR.mkdir(parents=True, exist_ok=True)
    for m in majors:
        path = PER_MAJOR_DIR / f"{m}.json"
        path.write_text(json.dumps(sorted(tags_by_major[m]), separators=(",", ":")))
    biggest = max(majors, key=lambda m: (PER_MAJOR_DIR / f"{m}.json").stat().st_size)
    print(
        f"wrote {len(majors)} per-major files to {PER_MAJOR_DIR} "
        f"(largest: {biggest}.json = {(PER_MAJOR_DIR / f'{biggest}.json').stat().st_size} bytes)"
    )


if __name__ == "__main__":
    main()
