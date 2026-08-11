---
name: programmer-resources
description: A curated directory of ~700 hand-picked websites for programmers, organized by need. Use when the user asks where to learn a topic, practice coding, prepare for interviews, find a tool, follow tech news, pick a podcast or YouTube channel, find project ideas, look for jobs or internships, or asks any "what site should I use for X" / "recommend a resource for X" question about programming, CS, or developer tooling.
---

# Programmer resources directory

A curated list of roughly 700 websites worth knowing, grouped by what you need
them for. Sourced from the community-maintained
[Best-websites-a-programmer-should-visit](https://github.com/sdmg15/Best-websites-a-programmer-should-visit)
list (MIT, by Sonkeng Maldini and contributors).

## How to use this

**Don't read the reference files end to end.** They're link dumps — several
thousand lines total. Pick the one file matching the need and grep it, or read
just the relevant `##` section.

1. Match the request to a file in the routing table below.
2. `grep -i` that file for the topic keyword (e.g. `grep -i "rust" references/learning.md`).
3. If nothing lands, grep `references/full-list.md` — it's the complete
   upstream list, verbatim, and catches anything the topic split missed.

Then recommend 3–6 options with a sentence on why each fits, rather than
pasting a whole section back at the user. Say what distinguishes the picks —
free vs paid, beginner vs advanced, interactive vs reading.

## Routing table

| If the user wants… | Read |
|---|---|
| Courses, books, tutorials, video series, language-specific resources, AI/ML learning, writing a compiler | `references/learning.md` |
| Coding practice, interview prep, competitive programming, internships, job boards | `references/practice-and-jobs.md` |
| Tech news, magazines, blogs, articles, podcasts, YouTube channels, documentaries, live coding streams | `references/news-and-reading.md` |
| Dev tools, shell/bash resources, online compilers, snippet sharing, open source discovery, "everything in one place" aggregators | `references/tools.md` |
| Help when stuck, general coding advice, code style guides, technical writing and talks | `references/craft-and-advice.md` |
| Project ideas, cryptocurrency, improving English, non-CS stuff for when you're burned out | `references/misc.md` |
| Anything not found above | `references/full-list.md` |

## Section index

Each reference file is split into `## ` sections — grep for these headings to
jump straight to one:

- **learning.md** — MOOCs for learning something new · Sites related to your preferred programming language · Learn AI · Building a Simple Compiler/Interpreter · Tutorials · What should a programmer know · Computer Books · Video Tutorials
- **practice-and-jobs.md** — Coding practice for beginners · Interview Preparation · Competitive programming · Internships · Jobs
- **news-and-reading.md** — News · Magazines · Documentaries · YouTube Channels · Good Articles · Podcasts · Watch others code · Blogs of Developers
- **tools.md** — General Tools · Bash and Shell scripting · Everything in one place · Online Compiler and Sharing Code snippets · Open Source Websites
- **craft-and-advice.md** — When you get stuck · General Coding advice · Coding Style · Seminar, research writing, talks, etc
- **misc.md** — CryptoCurrency · For those who want to start a small project but can't find the ideas · For improving your English · When you get bored from CS related stuff

## Caveats

- The list is community-curated and updated over time, so a few links rot and
  some "free" tiers change. Flag it if a recommendation looks stale rather
  than presenting every entry as verified.
- Entry descriptions come from the upstream list, not from first-hand testing.
- This snapshot was taken from upstream `master` in August 2026. To refresh,
  re-run the split described in `ATTRIBUTION.md`.
