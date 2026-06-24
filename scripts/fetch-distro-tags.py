#!/usr/bin/env python3
"""Refresh distribution-based Liberica image tag data from Docker Hub.

These are the classic `liberica-openjdk-*` / `liberica-openjre-*` images, one
repo per base distribution. Their tag scheme is `<version>[-<build>][-<arch>]`
(no libc/variant — the base distro IS the repo). Writes:

  - src/data/distro-tags.json       index: per-repo version/arch facet lists
  - public/distro-tags/<key>.json   full parsed entries, fetched on demand

Run from the repo root:  python3 scripts/fetch-distro-tags.py
"""
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "src" / "data" / "distro-tags.json"
PER_REPO_DIR = ROOT / "public" / "distro-tags"

# key -> (docker repo, label). Order = display order.
REPOS = {
    "openjdk-alpine": ("bellsoft/liberica-openjdk-alpine", "OpenJDK · Alpine"),
    "openjdk-alpine-musl": ("bellsoft/liberica-openjdk-alpine-musl", "OpenJDK · Alpine (musl)"),
    "openjdk-debian": ("bellsoft/liberica-openjdk-debian", "OpenJDK · Debian"),
    "openjdk-centos": ("bellsoft/liberica-openjdk-centos", "OpenJDK · CentOS"),
    "openjdk-rocky": ("bellsoft/liberica-openjdk-rocky", "OpenJDK · Rocky"),
    "openjdk-windowsservercore": ("bellsoft/liberica-openjdk-windowsservercore", "OpenJDK · Windows Server Core"),
    "openjre-alpine": ("bellsoft/liberica-openjre-alpine", "OpenJRE · Alpine"),
    "openjre-alpine-musl": ("bellsoft/liberica-openjre-alpine-musl", "OpenJRE · Alpine (musl)"),
    "openjre-debian": ("bellsoft/liberica-openjre-debian", "OpenJRE · Debian"),
    "openjre-centos": ("bellsoft/liberica-openjre-centos", "OpenJRE · CentOS"),
    "openjre-rocky": ("bellsoft/liberica-openjre-rocky", "OpenJRE · Rocky"),
}

ARCHES = {"x86_64", "aarch64", "armv7l", "amd64", "arm64"}


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
    arch = None
    version = tag
    head, _, last = tag.rpartition("-")
    if head and last in ARCHES:
        arch = last
        version = head
    cds = False
    if version.endswith("-cds"):
        cds = True
        version = version[: -len("-cds")]
    return {"tag": tag, "version": version, "arch": arch, "cds": cds}


def _vkey(v: str):
    # Best-effort natural sort. Each chunk -> (0, int) or (1, str) so numeric and
    # textual chunks never compare against each other (which would raise).
    out = []
    for p in re.split(r"[.\-u]", v):
        out.append((0, int(p)) if p.isdigit() else (1, p))
    return out


def main() -> None:
    PER_REPO_DIR.mkdir(parents=True, exist_ok=True)
    index_repos = []
    for key, (repo, label) in REPOS.items():
        tags = fetch_tags(repo)
        entries = sorted((parse_tag(t) for t in tags), key=lambda e: e["tag"])
        versions = sorted({e["version"] for e in entries}, key=_vkey, reverse=True)
        archs = sorted({e["arch"] for e in entries if e["arch"]})
        cds = any(e["cds"] for e in entries)
        facets = {"versions": versions, "archs": archs, "cds": cds}
        (PER_REPO_DIR / f"{key}.json").write_text(
            json.dumps({"repo": repo, "entries": entries, "facets": facets},
                       separators=(",", ":"))
        )
        index_repos.append({"key": key, "repo": repo, "label": label,
                            "facets": facets, "count": len(entries)})
        print(f"  {key}: {len(tags)} tags -> {key}.json")
    INDEX.write_text(json.dumps({"repos": index_repos}, separators=(",", ":")))
    print(f"wrote {INDEX} ({INDEX.stat().st_size} bytes) and {len(REPOS)} per-repo files")


if __name__ == "__main__":
    main()
