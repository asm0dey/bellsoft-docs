---
title: Get started with Alpaquita Linux
description: Pull the Alpaquita base image and install a JDK.
---

## Run the base image

```bash
docker run --rm -it bellsoft/alpaquita-linux-base:stream-musl sh
```

## Install Liberica JDK inside it

```bash
apk add bellsoft-java21
java -version
```
