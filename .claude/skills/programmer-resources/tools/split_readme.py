#!/usr/bin/env python3
"""Split the Best-websites-a-programmer-should-visit README into skill reference files."""
import os
import re
import sys
import unicodedata

SRC = os.environ.get("README_SRC", "README.md")

# Which reference file each section belongs to, keyed by a distinctive
# lowercase substring of the section heading.
GROUPS = [
    ("learning.md", [
        "moocs", "preferred programming language", "learn ai",
        "building a simple compiler", "tutorials", "what should a programmer know",
        "computer books", "video tutorials",
    ]),
    ("practice-and-jobs.md", [
        "coding practice for beginners", "interview preparation",
        "competitive programming", "internships", "jobs",
    ]),
    ("news-and-reading.md", [
        "news", "magazines", "documentaries", "youtube channels", "good articles",
        "podcasts", "watch others code", "blogs of developers",
    ]),
    ("tools.md", [
        "general tools", "bash and shell scripting", "everything in one place",
        "online compiler", "open source websites",
    ]),
    ("craft-and-advice.md", [
        "when you get stuck", "general coding advice", "coding style",
        "seminar, research writing",
    ]),
    ("misc.md", [
        "cryptocurrency", "small project", "improving your english",
        "when you get bored",
    ]),
]

GROUP_TITLES = {
    "learning.md": ("Learning & Courses",
                    "Courses, books, tutorials, and language-specific resources for "
                    "learning a new topic from scratch."),
    "practice-and-jobs.md": ("Practice, Interviews & Jobs",
                             "Places to practice coding, prepare for interviews, and find "
                             "internships or work."),
    "news-and-reading.md": ("News, Reading, Watching & Listening",
                            "Staying current: news sites, magazines, blogs, articles, "
                            "podcasts, YouTube channels, and documentaries."),
    "tools.md": ("Tools & Utilities",
                 "General developer tools, shell resources, online compilers, snippet "
                 "sharing, and aggregators."),
    "craft-and-advice.md": ("Craft, Style & Getting Unstuck",
                            "Where to go when stuck, plus advice on writing better code, "
                            "coding style, and technical writing."),
    "misc.md": ("Side Quests & Everything Else",
                "Project ideas, cryptocurrency, improving your English, and things to do "
                "when you're burned out on CS."),
}

ATTRIBUTION = (
    "> Curated from [Best-websites-a-programmer-should-visit]"
    "(https://github.com/sdmg15/Best-websites-a-programmer-should-visit) "
    "by Sonkeng Maldini and contributors (MIT License).\n"
)

BACK_TO_TOP = re.compile(
    r'\n*<div align="right">\s*\n\s*<b><a href="#index">.*?</a></b>\s*\n\s*</div>\n*',
    re.DOTALL,
)


def strip_emoji(text):
    """Drop emoji/pictographs so headings stay greppable as plain ASCII-ish text.

    Multi-codepoint emoji (e.g. person + ZWJ + computer) leave behind joiner and
    variation-selector codepoints once the pictographs go, so drop those too.
    """
    out = "".join(
        c for c in text
        if unicodedata.category(c) not in ("So", "Sk", "Cf")
        and not 0xFE00 <= ord(c) <= 0xFE0F  # variation selectors (category Mn)
    )
    return " ".join(out.split())


def parse_sections(md):
    """Return [(heading_text, body)] for every top-level `## ` section."""
    lines = md.split("\n")
    starts = [i for i, ln in enumerate(lines) if ln.startswith("## ")]
    sections = []
    for n, start in enumerate(starts):
        end = starts[n + 1] if n + 1 < len(starts) else len(lines)
        heading = lines[start][3:].strip()
        body = "\n".join(lines[start + 1:end])
        sections.append((heading, body))
    return sections


def group_for(heading):
    plain = strip_emoji(heading).lower()
    for filename, keys in GROUPS:
        for key in keys:
            if key in plain:
                return filename
    return None


def main(out_dir):
    with open(SRC, encoding="utf-8") as fh:
        readme = fh.read()

    refs = os.path.join(out_dir, "references")
    os.makedirs(refs, exist_ok=True)

    buckets = {filename: [] for filename, _ in GROUPS}
    unmatched = []
    for heading, body in parse_sections(readme):
        plain = strip_emoji(heading)
        if plain.lower() in ("index", "special thanks"):
            continue
        target = group_for(heading)
        if target is None:
            unmatched.append(plain)
            continue
        body = BACK_TO_TOP.sub("\n", body).strip()
        buckets[target].append("## {}\n\n{}\n".format(plain, body))

    for filename, chunks in buckets.items():
        if not chunks:
            print("WARNING: no sections landed in {}".format(filename))
            continue
        title, blurb = GROUP_TITLES[filename]
        doc = "# {}\n\n{}\n\n{}\n---\n\n{}".format(
            title, blurb, ATTRIBUTION, "\n\n".join(chunks)
        )
        with open(os.path.join(refs, filename), "w", encoding="utf-8") as fh:
            fh.write(doc)
        print("{:24s} {:2d} sections".format(filename, len(chunks)))

    # Full upstream list, verbatim, as the fallback lookup.
    full = os.path.join(refs, "full-list.md")
    with open(full, "w", encoding="utf-8") as fh:
        fh.write(
            "# Full upstream list (verbatim)\n\n"
            "Unedited copy of the upstream README, kept so nothing is lost in the "
            "topic split above. Prefer the topic files; fall back to this when a "
            "search turns up nothing.\n\n"
            + ATTRIBUTION + "\n---\n\n" + readme
        )
    print("full-list.md            verbatim copy")

    if unmatched:
        print("UNMATCHED SECTIONS: {}".format(unmatched))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
