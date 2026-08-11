# Attribution and refresh

## Source

The contents of `system-prompts/` are copied verbatim from
[Piebald-AI/claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts),
which extracts and publishes the prompts shipped inside the Claude Code CLI.
Snapshot taken from CLI **v2.1.226**.

Two layers of rights apply, and they are not the same thing:

- **The repository packaging** (extraction tooling, file layout, the `name` /
  `description` headers) is MIT-licensed, Copyright (c) 2025 Piebald LLC. Full
  text below.
- **The prompt text itself** originates from Anthropic's Claude Code CLI. It is
  not Piebald's to license, and the MIT grant does not extend to it. It is
  reproduced here as an internal engineering reference only. Don't redistribute
  it as your own work or present it as official Anthropic documentation.

Nothing in `system-prompts/` was edited. Everything under `index/` is generated
from those files by `tools/build_index.py`.

## Not bundled

Upstream also ships `CHANGELOG.md` (396KB of prompt diffs across 252 releases)
and a `README.md` that inlines every prompt again alongside token counts. Both
were left out to keep this skill to the ~4.3MB of prompt text that's actually
useful to look things up in. Clone upstream if you need version history.

## Refreshing the snapshot

```sh
git clone --depth 1 https://github.com/Piebald-AI/claude-code-system-prompts.git /tmp/ccsp
cd .claude/skills/claude-code-system-prompts
rm -rf system-prompts && cp -r /tmp/ccsp/system-prompts .
python3 tools/build_index.py .
```

`tools/build_index.py` rebuilds every file under `index/`. It prints an
`UNINDEXED FILES` warning and exits non-zero if upstream introduces a filename
prefix outside the five known categories — when that happens, add the new
prefix to the `CATEGORIES` table in the script and re-run.

After refreshing, update the CLI version, the per-category counts, and the
category table in `SKILL.md`.

## Upstream license (repository packaging)

```
MIT License

Copyright (c) 2025 Piebald LLC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
