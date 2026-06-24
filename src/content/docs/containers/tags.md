---
title: Container image tags
description: Tag naming scheme for bellsoft/liberica-runtime-container.
---

Tags follow the pattern:

```
[jdk type]-[java version]-[crac]-[cds]-[slim]-[libc type]
```

Images come in **musl** or **glibc** variants, with optional **CRaC** and
**Class Data Sharing (CDS)** builds.

| Example tag | Meaning |
| --- | --- |
| `jdk-all-21-glibc` | Full JDK 21, glibc |
| `jdk-17-glibc` | JDK Lite 17, glibc |
| `jre-21-crac-slim-glibc` | Slim JRE 21 with CRaC, glibc |
| `jre-11-slim-musl` | Slim JRE 11, musl |
