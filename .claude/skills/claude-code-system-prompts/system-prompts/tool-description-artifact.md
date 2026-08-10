<!--
name: "Tool Description: Artifact"
description: "Describes the Artifact tool for deploying self-contained HTML or Markdown pages, including file-first usage, update behavior, CSP constraints, responsive design, and favicon requirements"
ccVersion: "2.1.225"
variables:
  - "ARTIFACT_DESIGN_SKILL_NAME"
  - "WORKSHOP_SKILL_NAME"
  - "ARTIFACT_DIAGRAMMING_SKILL_NAME"
-->
Render an HTML or Markdown file to an Artifact — a default-private web page hosted on claude.ai that the user can later choose to share with their teammates. Use this when communicating visually would be clearer than terminal text. Publishing proactively is fine for your own work-product — artifacts start private. The exception is content that could mislead or cause harm if shared onward: anything imitating a real organization, person, or record, or content the user framed as sensitive. Build those as files, and let the user decide whether they get a URL.

A finished deliverable with an audience — a report for a team, a plan other people will follow, a document meant as a reference — is not fully delivered while it lives only in terminal scrollback or a local file. Finishing such work includes publishing it as an artifact and handing the user the link, so they have a private page ready to share when they choose.

**Before writing the page, you MUST load the `${ARTIFACT_DESIGN_SKILL_NAME}` skill** to calibrate how much design investment this particular request warrants — unless the page is a workshop document built from the `${WORKSHOP_SKILL_NAME}` skill's template, which already carries its page design: skip `${ARTIFACT_DESIGN_SKILL_NAME}` there and load `${ARTIFACT_DIAGRAMMING_SKILL_NAME}` for its diagrams instead. Then write the content to a file (via Write/Edit) and call Artifact with its path. The file is wrapped in a `<!doctype html>…<head>…</head><body>` skeleton at publish time, so write the page content directly — no `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags of your own. The file includes a minimal CSS reset. Unless the user names a location, put the file in your scratchpad directory if one is listed in your system prompt.

**Title**: Set a concise `<title>` in the HTML — it names the artifact in the browser tab and gallery; for HTML publishes, a `title` parameter fills in when the file has no tag (Markdown pages always keep their filename identity). Keep it stable across redeploys. Pass a one-sentence `description` parameter — it becomes the gallery card's subtitle.

