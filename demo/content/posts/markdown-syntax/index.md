---
title: "How to Structure Technical Notes"
date: 2026-07-12 18:40:00+0500
description: "A small style guide for notes: headings, tables, lists, quotes, and code blocks."
tags:
    - markdown
    - notes
    - writing
    - frontend
categories:
    - Writing
    - Development
---

When a blog lives longer than a couple of weeks, consistency starts to matter as much as the writing itself. This note collects a few simple rules for technical posts: how to split material into sections, when to use tables, how to show code, and how to handle longer explanations.

<!--more-->

## Headings

Avoid making the structure too deep. Three levels are usually enough: topic, section, and a short subsection. If a fourth level appears, the article probably wants to become two separate notes.

# H1
## H2
### H3
#### H4
##### H5
###### H6

## Paragraphs

A good paragraph carries one idea. In technical writing this is especially visible: when the problem, context, solution, and conclusion are mixed into one long block, the reader has to go back and rebuild the meaning.

Short paragraphs are easier to scan. That does not mean every article should become a list. Sometimes a calm paragraph explains a tradeoff better than five bullet points in a row.

## Quotes

Quotes are useful not only for references, but also for important notes inside an article.

### Quote Without Attribution

> If an idea needs emphasis but is not a warning, a regular quote often feels calmer than a bright alert.
> Quotes can include **bold text**, *italic text*, and `inline code`.

### Quote With Attribution

> Programs must be written for people to read, and only incidentally for machines to execute.<br>
> — <cite>Harold Abelson[^1]</cite>

[^1]: From *Structure and Interpretation of Computer Programs*.

## Tables

Tables work best when the goal is comparison, not storytelling.

| Format | When to Use It |
| ------ | -------------- |
| Paragraph | To explain context |
| List | To show a sequence of actions |
| Table | To compare several options |

### Markdown Inside Tables

| Italic   | Bold     | Code   |
| -------- | -------- | ------ |
| *italic* | **bold** | `code` |

| Task | Short Version | Detailed Version | Risk |
| ---- | ------------- | ---------------- | ---- |
| Update theme colors | Change color tokens | Check both light and dark schemes | Low |
| Rewrite a template | Edit a partial | Check every page that uses it | Medium |
| Add a shortcode | Create template and styles | Check Markdown, HTML, and RSS output | Medium |

## Code Blocks

### Code Block With Backticks

```ts
type NoteStatus = "draft" | "review" | "published";

function getStatusLabel(status: NoteStatus): string {
  const labels = {
    draft: "Draft",
    review: "In review",
    published: "Published",
  };

  return labels[status];
}
```

### Indented Code Block

    npm run dev
    hugo server --disableFastRender

### Diff Block

```diff
- color: var(--body-text-color);
+ color: var(--card-text-color-main);
```

### One-Line Code Block

```scss
border-radius: var(--card-border-radius);
```

## Lists

### Ordered List

1. Define the task.
2. Find an existing pattern in the project.
3. Make the smallest useful change.
4. Run the build.

### Unordered List

* Drafts should stay compact.
* Examples should feel close to real work.
* Tables are worth using only when they help compare things.

### Nested List

* Content
  * posts
  * pages
  * categories
* Theme
  * layouts
  * assets
  * shortcodes

## Other Elements — abbr, sub, sup, kbd, mark

<abbr title="Application Programming Interface">API</abbr> is a contract between parts of a system.

log<sub>2</sub>(n)

O(n<sup>2</sup>)

Press <kbd>Cmd</kbd> + <kbd>K</kbd> to open quick actions.

Sometimes it is useful to <mark>highlight</mark> one word, but the whole paragraph should not become a marker.
