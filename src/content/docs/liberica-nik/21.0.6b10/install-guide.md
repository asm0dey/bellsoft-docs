---
title: "Liberica NIK 21: Installation Guide"
slug: liberica-nik/21.0.6b10/install-guide
description: Install Liberica Native Image Kit (bundles Java 21) and build your first native image.
---

## Install

Download the NIK 21 archive for your platform from the BellSoft downloads page,
unpack it, and put its `bin` on your `PATH`:

```bash
tar -zxvf bellsoft-nik-21-linux-amd64.tar.gz
export PATH="$PWD/bellsoft-nik-21/bin:$PATH"
```

## Build a native HelloWorld

```bash
cat > HelloWorld.java <<'EOF'
public class HelloWorld {
  public static void main(String[] args) {
    System.out.println("Hello, native world!");
  }
}
EOF

javac HelloWorld.java
native-image HelloWorld
./helloworld
```
