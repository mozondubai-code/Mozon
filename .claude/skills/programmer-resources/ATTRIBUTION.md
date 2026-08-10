# Attribution and refresh

## Source

The link data in `references/` comes from
[sdmg15/Best-websites-a-programmer-should-visit](https://github.com/sdmg15/Best-websites-a-programmer-should-visit),
a community-curated list by Sonkeng Maldini and contributors, released under
the MIT License.

Nothing was rewritten — `references/full-list.md` is the upstream `README.md`
verbatim, and the topic files are the same content regrouped into six themed
files so the skill can load only what a given question needs.

## Refreshing the snapshot

Snapshot taken from upstream `master`, August 2026.

```sh
git clone --depth 1 https://github.com/sdmg15/Best-websites-a-programmer-should-visit.git /tmp/bwapsv
cd .claude/skills/programmer-resources
README_SRC=/tmp/bwapsv/README.md python3 tools/split_readme.py .
```

`tools/split_readme.py` regenerates every file under `references/`. It prints a
`UNMATCHED SECTIONS` warning and exits non-zero if upstream adds a section the
routing map in the script doesn't recognize — when that happens, add the new
section's heading keyword to the `GROUPS` table and re-run.

After refreshing, update the section index in `SKILL.md` if the section list
changed.

## Upstream license

```
MIT License

Copyright (c) 2017 Sonkeng Maldini

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
