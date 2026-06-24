---
title: Using Liberica JDK in your IDE
description: Register Liberica JDK as an SDK in IntelliJ IDEA, Eclipse, and VS Code.
---

This page applies to every Liberica JDK version — use the version dropdown only
on version-specific pages (Install Guide, Release Notes).

## IntelliJ IDEA

File → Project Structure → SDKs → **+** → Add JDK → select the Liberica JDK
install directory (e.g. the path printed by `update-alternatives --list java`).

## Eclipse

Preferences → Java → Installed JREs → **Add** → Standard VM → set the JRE home
to the Liberica JDK directory.

## VS Code

Set `java.jdt.ls.java.home` (and optionally `java.configuration.runtimes`) in
`settings.json` to the Liberica JDK path.
