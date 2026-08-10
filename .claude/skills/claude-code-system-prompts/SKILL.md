---
name: claude-code-system-prompts
description: The full text of Claude Code's own system prompts, tool descriptions, bundled skills, and subagent prompts (636 files, captured at CLI v2.1.226). Use when the user asks how Claude Code behaves internally, what a built-in tool's description or parameter actually says, how a bundled skill is written, what a subagent is instructed to do, or wants a reference for authoring their own agent prompts, skills, hooks, or tool descriptions in the same style.
---

# Claude Code system prompts

A captured copy of the prompts shipped inside the Claude Code CLI — the system
prompts, per-tool descriptions, bundled skill text, and subagent instructions.
Extracted and published by [Piebald](https://github.com/Piebald-AI/claude-code-system-prompts)
from CLI **v2.1.226**.

## What this is good for

- Answering "why does Claude Code do X?" from the actual instruction text
  rather than from guesswork.
- Looking up exactly what a tool's description or a specific parameter says.
- Using shipped prompts as style references when authoring your own skills,
  subagent prompts, hook prompts, or tool descriptions.

## How to use this

**Never read `system-prompts/` in bulk** — it's 636 files and ~4.3MB. Always go
through the index.

1. Pick the category index from the table below.
2. `grep -i` it for your keyword — the tables carry each prompt's name and a
   one-line description, so keyword matches are reliable.
   Example: `grep -i "permission" index/system.md`
3. Read only the matching file(s) under `system-prompts/`.

If you don't know the category, grep all indexes at once:
`grep -ri "keyword" index/`

## Categories

| Category | Index | Count | Contents |
|---|---|---:|---|
| System | `index/system.md` | 221 | Main loop, output styles, safety and permission framing, environment context, per-surface variants |
| Tool | `index/tool.md` | 160 | Built-in tool descriptions and individual parameter docs |
| Data | `index/data.md` | 106 | Embedded templates, canned messages, reference tables |
| Skill | `index/skill.md` | 84 | Full text of skills bundled with the CLI |
| Agent | `index/agent.md` | 65 | Subagent and background-worker prompts |

## File format

Each prompt file opens with an HTML-comment header, then the verbatim prompt
text:

```
<!--
name: "Tool Parameter: matched ask rule"
description: "Describes metadata identifying a user-configured permissions.ask rule..."
ccVersion: "2.1.213"
variables:
  - "SOME_INTERPOLATED_VALUE"
-->
<prompt text>
```

`${VARIABLE}` placeholders in the body are runtime interpolations done by the
CLI, not literal text the model sees.

## Caveats

- **A snapshot, not live.** Captured at v2.1.226. Prompts change frequently —
  `ccVersion` in each header is the release that prompt was last seen changing
  in. Check the version before treating any detail as current.
- **Extracted, not official.** This is community reverse-engineering of the CLI
  bundle, not an Anthropic-published spec. Treat it as strong evidence of
  behavior, not a contract. Don't cite it to the user as official documentation.
- **Not the running prompt.** These are the prompts of the *Claude Code CLI*.
  The session reading this file may be running on a different surface, version,
  or configuration, so what's here may not describe the current session.
- The upstream `CHANGELOG.md` (396KB of per-version diffs across 252 releases)
  and `README.md` are deliberately not bundled; see `ATTRIBUTION.md` to fetch
  them if you need version history.
