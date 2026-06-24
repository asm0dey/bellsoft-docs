---
title: Guide to JVM memory configuration options
description: Control heap and metaspace sizing for Liberica JDK.
---

## Heap size

```bash
java -Xms512m -Xmx2g -jar app.jar
```

- `-Xms` — initial heap.
- `-Xmx` — maximum heap.

## Container-aware sizing

In containers, prefer percentage-based sizing so the JVM respects cgroup limits:

```bash
java -XX:InitialRAMPercentage=50 -XX:MaxRAMPercentage=75 -jar app.jar
```

## Metaspace

```bash
java -XX:MaxMetaspaceSize=256m -jar app.jar
```
