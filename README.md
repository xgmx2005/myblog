# CC Personal Site

CC 的个人网站，使用 Astro Theme Pure 构建，内容包括 AI 探索、搭建记录、工具资源和生活随笔。

## Upstream provenance

Imported from [cworld1/astro-theme-pure](https://github.com/cworld1/astro-theme-pure) at commit `0047f6d4278d4c3e823dca608022cd6ebe7b5c96` on 2026-07-15.

## Local development

- Node.js: `v24.16.0`
- Package manager: Bun

```bash
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:4321`.

## Writing

Add Markdown or MDX files under `src/content/blog/`. A minimal post uses:

```yaml
---
title: 第一篇文章
description: 这篇文章解决什么问题。
publishDate: 2026-07-15
tags:
  - AI 探索
  - 搭建记录
language: zh-CN
draft: false
---
```

Recommended tags are `AI 探索`, `搭建记录`, `工具资源`, and `生活随笔`. Multiple tags are allowed.

## Verification

```bash
bun test
bun run check
bun run build
```

## Deployment

The production branch is `main`. Vercel Git integration builds preview deployments for other branches and production deployments for `main`. Set `SITE_URL` in Vercel to the real production origin. This repository intentionally contains no GitHub Actions deployment workflow.
