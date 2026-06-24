---
title: Using the container images
description: Pull, run, and build on Liberica container images.
---

## Pull

```bash
docker pull bellsoft/liberica-runtime-container:jdk-all-21-glibc
```

## Run

```bash
docker run --rm bellsoft/liberica-runtime-container:jdk-all-21-glibc java -version
```

## Build your app on top

```dockerfile
FROM bellsoft/liberica-runtime-container:jre-21-slim-glibc
COPY target/app.jar /app/app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```
