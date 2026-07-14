---
title: "Formulas in a Technical Article"
description: "How inline formulas and larger mathematical blocks look in the current theme."
date: 2026-07-10 09:25:00+0500
math: true
categories:
    - Development
    - Notes
tags:
    - math
    - katex
    - markdown
    - documentation
---

A blog post does not always need to be a full scientific article. Sometimes it only needs a couple of clean formulas: to show complexity, explain smoothing, or write down a simple loss function. This theme uses [KaTeX](https://katex.org/) for that.

For a single article, add `math: true` to the front matter. This keeps math rendering disabled on pages that do not need it.

## Inline Formulas

Inline formulas are useful for short expressions inside a sentence. For example, the mean value can be written as $\mu = \frac{1}{n}\sum_{i=1}^{n}x_i$.

```markdown
$\mu = \frac{1}{n}\sum_{i=1}^{n}x_i$
```

## Block Formulas

Larger formulas are easier to read as separate blocks. They do not break the rhythm of the paragraph and behave better on narrow screens.

$$
    \sigma(x) = \frac{1}{1 + e^{-x}}
$$

```markdown
$$
    \sigma(x) = \frac{1}{1 + e^{-x}}
$$
```

Another practical example is exponential smoothing. It is useful when a trend should remain visible while noise is reduced.

$$
    s_t = \alpha x_t + (1 - \alpha)s_{t-1}, \quad 0 < \alpha < 1
$$

```markdown
$$
    s_t = \alpha x_t + (1 - \alpha)s_{t-1}, \quad 0 < \alpha < 1
$$
```

And one more example for machine learning notes:

$$
    L(y, \hat y) = -\sum_{i=1}^{k} y_i \log(\hat y_i)
$$

These blocks show how the theme handles indices, fractions, Greek letters, and longer expressions.
