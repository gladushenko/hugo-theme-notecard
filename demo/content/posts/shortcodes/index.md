---
title: "Useful Shortcodes for a Blog"
description: "A test page for videos, external embeds, and quotes."
date: 2026-07-08 21:15:00+0500
image: cover.jpg
categories:
    - Development
    - Hugo
tags:
    - hugo
    - shortcodes
    - embeds
    - media
---

Shortcodes are useful when regular Markdown is not enough. This page works as a living checklist: after theme changes, it helps verify videos, external embeds, and quote blocks.

## Bilibili Video

An external iframe example. It should keep its aspect ratio, stay inside the card, and work well in dark mode.

{{< bilibili "BV1d4411N7zD" >}}

## Tencent Video

Another iframe player, useful for checking more than one YouTube-like scenario.

{{< tencent "g0014r3khdw" >}}

## YouTube Video

This is the most common video format for a blog. The block should take the full content width and keep vertical spacing predictable. The examples below use public videos that usually work well in embedded players.

{{< youtube "M7lc1UVf-VE" >}}

{{< youtube "jNQXAC9IVRw" >}}

## Generic Video File

A regular video file is useful for local demos: screen recordings, short tutorials, or visual notes.

{{< video "https://www.w3schools.com/tags/movie.mp4" >}}

## GitLab

External snippets are useful when a live code example should be shown without copying it manually.

{{< gitlab 2589724 >}}

## Quote

{{< quote author="Gladushenko" source="Working Notes" url="https://github.com/gladushenko">}}
Every documentation example should be small enough to understand quickly and realistic enough not to feel like a toy.
{{< /quote >}}
