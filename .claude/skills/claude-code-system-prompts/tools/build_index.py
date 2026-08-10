#!/usr/bin/env python3
"""Build searchable per-category indexes for the Claude Code system prompt dump.

Reads every file in <skill>/system-prompts/ and writes one index table per
category to <skill>/index/. The prompt files themselves are left untouched.

Usage: python3 tools/build_index.py <skill-dir>
"""
import os
import re
import sys

# Filename prefix -> (index filename, human title, blurb)
CATEGORIES = {
    "system": ("system.md", "System prompts",
               "Top-level prompts that define Claude Code's own behavior: the main "
               "loop, output styles, permission and safety framing, environment "
               "context, and per-surface variants."),
    "tool": ("tool.md", "Tool descriptions and parameters",
             "The description text Claude sees for each built-in tool, plus "
             "per-parameter documentation."),
    "data": ("data.md", "Embedded data and templates",
             "Static payloads shipped with the CLI: templates, canned messages, "
             "reference tables, and generated boilerplate."),
    "skill": ("skill.md", "Bundled skills",
              "Full text of the skills that ship with Claude Code, e.g. the "
              "claude-api reference, artifact design, and document skills."),
    "agent": ("agent.md", "Subagent prompts",
              "Prompts driving spawned agents and background workers: explore, "
              "plan, review, summarization, classification, and hooks."),
}

HEADER = re.compile(r"^<!--\n(.*?)\n-->", re.DOTALL)
FIELD = re.compile(r'^(\w+):\s*"?(.*?)"?\s*$')


def parse(path):
    """Pull name/description/ccVersion and a variable count out of a prompt file."""
    with open(path, encoding="utf-8") as fh:
        text = fh.read()

    match = HEADER.match(text)
    if not match:
        return None

    meta = {"variables": 0}
    in_vars = False
    for line in match.group(1).split("\n"):
        if line.startswith("  - "):
            if in_vars:
                meta["variables"] += 1
            continue
        in_vars = False
        field = FIELD.match(line)
        if not field:
            continue
        key, value = field.group(1), field.group(2)
        if key == "variables":
            in_vars = True
        else:
            meta[key] = value

    body = text[match.end():].strip()
    meta["words"] = len(body.split())
    return meta


def escape(text):
    """Keep markdown table cells intact."""
    return text.replace("|", "\\|").replace("\n", " ").strip()


def main(skill_dir):
    src = os.path.join(skill_dir, "system-prompts")
    out = os.path.join(skill_dir, "index")
    os.makedirs(out, exist_ok=True)

    buckets = {key: [] for key in CATEGORIES}
    skipped = []

    for filename in sorted(os.listdir(src)):
        if not filename.endswith(".md"):
            continue
        prefix = filename.split("-", 1)[0]
        if prefix not in buckets:
            skipped.append(filename)
            continue
        meta = parse(os.path.join(src, filename))
        if meta is None:
            skipped.append(filename)
            continue
        buckets[prefix].append((filename, meta))

    for prefix, entries in buckets.items():
        filename, title, blurb = CATEGORIES[prefix]
        rows = [
            "| `{}` | {} | {} | {} |".format(
                name,
                escape(meta.get("name", "")),
                escape(meta.get("description", "")),
                meta["words"],
            )
            for name, meta in entries
        ]
        doc = (
            "# {}\n\n{}\n\n"
            "{} prompts. Grep this table for a keyword, then read the matching file "
            "under `../system-prompts/`.\n\n"
            "| File | Name | Description | Words |\n|---|---|---|---:|\n{}\n"
        ).format(title, blurb, len(entries), "\n".join(rows))
        with open(os.path.join(out, filename), "w", encoding="utf-8") as fh:
            fh.write(doc)
        print("{:12s} {:3d} prompts".format(filename, len(entries)))

    if skipped:
        print("UNINDEXED FILES ({}): {}".format(len(skipped), skipped[:10]))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
