---
title: Using CRaC with Java applications
description: Snapshot and restore a running JVM for near-instant startup.
---

CRaC (Coordinated Restore at Checkpoint) snapshots a running JVM and restores it
later for near-instant startup. Use a CRaC-enabled Liberica JDK build.

## Take a checkpoint

```bash
java -XX:CRaCCheckpointTo=./cr -jar app.jar
# in another shell, once the app is warm:
jcmd app.jar JDK.checkpoint
```

## Restore

```bash
java -XX:CRaCRestoreFrom=./cr
```

Make resources CRaC-aware by implementing `jdk.crac.Resource` and registering
with `Core.getGlobalContext().register(...)` to close/reopen files and sockets
around the checkpoint.
