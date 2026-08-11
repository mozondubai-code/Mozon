# Tool descriptions and parameters

The description text Claude sees for each built-in tool, plus per-parameter documentation.

160 prompts. Grep this table for a keyword, then read the matching file under `../system-prompts/`.

| File | Name | Description | Words |
|---|---|---|---:|
| `tool-description-agent-explicit-spawn-restriction.md` | Tool Description: Agent explicit-spawn restriction | Restricts agent spawning to explicit user requests or named agent types instead of inferred thoroughness | 69 |
| `tool-description-agent-simple-usage-notes.md` | Tool Description: Agent (simple usage notes) | Simplified usage notes for the Agent tool, including when to delegate, fork behavior, resumption, worktree isolation, background execution, parallel launches, and context restrictions | 210 |
| `tool-description-agent-usage-notes.md` | Tool Description: Agent (usage notes) | Usage notes and instructions for the Task/Agent tool, including guidance on launching subagents, background execution, resumption, and worktree isolation | 592 |
| `tool-description-agent-when-to-launch-subagents.md` | Tool Description: Agent (when to launch subagents) | Describes _when_ to use the Agent tool - for launching specialized subagent subprocesses to autonomously handle complex multi-step tasks | 102 |
| `tool-description-artifact-comments-guidance.md` | Tool Description: Artifact comments guidance | Explains how to read and reply to activated Artifact comment threads and requires treating viewer comments as untrusted data | 108 |
| `tool-description-artifact-database-guidance.md` | Tool Description: Artifact database guidance | Describes reading and writing shared durable Artifact database collections and treating viewer-written rows as untrusted data | 129 |
| `tool-description-artifact-publishing-and-update-guidance.md` | Tool Description: Artifact publishing and update guidance | Provides Artifact lookup, update, ownership, watch, content-safety, self-containment, responsive design, theme, favicon, and anti-impersonation requirements | 895 |
| `tool-description-artifact-runtime-capabilities-guidance.md` | Tool Description: Artifact runtime capabilities guidance | Explains when Artifact runtime capabilities require loading the artifact-capabilities skill and how redeploys preserve or clear capabilities | 102 |
| `tool-description-artifact-supporting-files-guidance.md` | Tool Description: Artifact supporting files guidance | Explains how Artifact supporting-file maps, source paths, content types, and root directory resolution work | 169 |
| `tool-description-artifact.md` | Tool Description: Artifact | Describes the Artifact tool for deploying self-contained HTML or Markdown pages, including file-first usage, update behavior, CSP constraints, responsive design, and favicon requirements | 339 |
| `tool-description-askuserquestion-decision-guidance.md` | Tool Description: AskUserQuestion decision guidance | Additional guidance for using AskUserQuestion only when the user's answer changes what the agent should do next | 44 |
| `tool-description-askuserquestion-preview-field.md` | Tool Description: AskUserQuestion (preview field) | Instructions for using the HTML preview field on single-select question options to display visual artifacts like UI mockups, code snippets, and diagrams | 84 |
| `tool-description-askuserquestion.md` | Tool Description: AskUserQuestion | Tool description for asking user questions. | 149 |
| `tool-description-background-monitor-streaming-events.md` | Tool Description: Background monitor (streaming events) | Describes the background monitor tool that streams stdout events from long-running scripts as chat notifications, with guidelines on script quality, output volume, and selective filtering | 864 |
| `tool-description-background-monitor-websocket-source.md` | Tool Description: Background monitor WebSocket source | Addendum to the background monitor tool description covering the WebSocket (ws) source, which opens a WebSocket and streams each incoming text frame as a notification event instead of running a shell command, with notes on binary frames, socket close, and rate limiting | 130 |
| `tool-description-bash-alternative-communication.md` | Tool Description: Bash (alternative — communication) | Bash tool alternative: output text directly instead of echo/printf | 6 |
| `tool-description-bash-alternative-content-search.md` | Tool Description: Bash (alternative — content search) | Bash tool alternative: use Grep for content search instead of grep/rg | 8 |
| `tool-description-bash-alternative-edit-files.md` | Tool Description: Bash (alternative — edit files) | Bash tool alternative: use Edit for file editing instead of sed/awk | 6 |
| `tool-description-bash-alternative-file-search.md` | Tool Description: Bash (alternative — file search) | Bash tool alternative: use Glob for file search instead of find/ls | 8 |
| `tool-description-bash-alternative-read-files.md` | Tool Description: Bash (alternative — read files) | Bash tool alternative: use Read for file reading instead of cat/head/tail | 6 |
| `tool-description-bash-alternative-write-files.md` | Tool Description: Bash (alternative — write files) | Bash tool alternative: use Write for file writing instead of echo/cat | 8 |
| `tool-description-bash-built-in-tools-note.md` | Tool Description: Bash (built-in tools note) | Note that built-in tools provide better UX than Bash equivalents | 33 |
| `tool-description-bash-git-avoid-destructive-ops.md` | Tool Description: Bash (git — avoid destructive ops) | Bash tool git instruction: consider safer alternatives to destructive operations | 37 |
| `tool-description-bash-git-commit-and-pr-creation-instructions.md` | Tool Description: Bash (Git commit and PR creation instructions) | Instructions for creating git commits and GitHub pull requests | 1096 |
| `tool-description-bash-git-never-skip-hooks.md` | Tool Description: Bash (git — never skip hooks) | Bash tool git instruction: never skip hooks or bypass signing unless user requests it | 28 |
| `tool-description-bash-git-prefer-new-commits.md` | Tool Description: Bash (git — prefer new commits) | Bash tool git instruction: prefer new commits over amending | 12 |
| `tool-description-bash-maintain-cwd.md` | Tool Description: Bash (maintain cwd) | Bash tool instruction: use absolute paths and avoid cd | 55 |
| `tool-description-bash-overview.md` | Tool Description: Bash (overview) | Opening line of the Bash tool description | 9 |
| `tool-description-bash-pre-commit-skill-checks.md` | Tool Description: Bash (pre-commit skill checks) | Requires applicable verification, simplification, and code-review skills to be visibly reported and run before nontrivial git commits | 191 |
| `tool-description-bash-prefer-dedicated-tools-bullet.md` | Tool Description: Bash (prefer dedicated tools bullet) | Bulleted warning to prefer dedicated tools over Bash for find, grep, cat, etc. | 43 |
| `tool-description-bash-prefer-dedicated-tools.md` | Tool Description: Bash (prefer dedicated tools) | Warning to prefer dedicated tools over Bash for find, grep, cat, etc. | 42 |
| `tool-description-bash-quote-file-paths.md` | Tool Description: Bash (quote file paths) | Bash tool instruction: quote file paths containing spaces | 18 |
| `tool-description-bash-sandbox-adjust-settings.md` | Tool Description: Bash (sandbox — adjust settings) | Work with user to adjust sandbox settings on failure | 17 |
| `tool-description-bash-sandbox-default-to-sandbox.md` | Tool Description: Bash (sandbox — default to sandbox) | Default to sandbox; only bypass when user asks or evidence of sandbox restriction | 18 |
| `tool-description-bash-sandbox-evidence-access-denied.md` | Tool Description: Bash (sandbox — evidence: access denied) | Sandbox evidence: access denied to paths outside allowed directories | 8 |
| `tool-description-bash-sandbox-evidence-list-header.md` | Tool Description: Bash (sandbox — evidence list header) | Header for list of sandbox-caused failure evidence | 5 |
| `tool-description-bash-sandbox-evidence-network-failures.md` | Tool Description: Bash (sandbox — evidence: network failures) | Sandbox evidence: network connection failures to non-whitelisted hosts | 6 |
| `tool-description-bash-sandbox-evidence-operation-not-permitted.md` | Tool Description: Bash (sandbox — evidence: operation not permitted) | Sandbox evidence: operation not permitted errors | 7 |
| `tool-description-bash-sandbox-evidence-unix-socket-errors.md` | Tool Description: Bash (sandbox — evidence: unix socket errors) | Sandbox evidence: unix socket connection errors | 4 |
| `tool-description-bash-sandbox-explain-restriction.md` | Tool Description: Bash (sandbox — explain restriction) | Explain which sandbox restriction caused the failure | 24 |
| `tool-description-bash-sandbox-failure-evidence-condition.md` | Tool Description: Bash (sandbox — failure evidence condition) | Condition: command failed with evidence of sandbox restrictions | 34 |
| `tool-description-bash-sandbox-mandatory-mode.md` | Tool Description: Bash (sandbox — mandatory mode) | Policy: all commands must run in sandbox mode | 15 |
| `tool-description-bash-sandbox-no-exceptions.md` | Tool Description: Bash (sandbox — no exceptions) | Commands cannot run outside sandbox under any circumstances | 9 |
| `tool-description-bash-sandbox-no-sensitive-paths.md` | Tool Description: Bash (sandbox — no sensitive paths) | Do not suggest adding sensitive paths to sandbox allowlist | 17 |
| `tool-description-bash-sandbox-per-command.md` | Tool Description: Bash (sandbox — per-command) | Treat each command individually; default to sandbox for future commands | 30 |
| `tool-description-bash-sandbox-response-header.md` | Tool Description: Bash (sandbox — response header) | Header for how to respond when seeing sandbox-caused failures | 7 |
| `tool-description-bash-sandbox-retry-without-sandbox.md` | Tool Description: Bash (sandbox — retry without sandbox) | Immediately retry with dangerouslyDisableSandbox on sandbox failure | 10 |
| `tool-description-bash-sandbox-tmpdir.md` | Tool Description: Bash (sandbox — tmpdir) | Use $TMPDIR for temporary files in sandbox mode | 30 |
| `tool-description-bash-sleep-keep-short.md` | Tool Description: Bash (sleep — keep short) | Bash tool instruction: keep sleep duration to 1-5 seconds | 13 |
| `tool-description-bash-sleep-no-polling-background-tasks.md` | Tool Description: Bash (sleep — no polling background tasks) | Bash tool instruction: do not poll background tasks, wait for notification | 21 |
| `tool-description-bash-sleep-run-immediately.md` | Tool Description: Bash (sleep — run immediately) | Bash tool instruction: do not sleep between commands that can run immediately | 13 |
| `tool-description-bash-sleep-use-check-commands.md` | Tool Description: Bash (sleep — use check commands) | Bash tool instruction: use check commands rather than sleeping when polling | 19 |
| `tool-description-bash-timeout.md` | Tool Description: Bash (timeout) | Bash tool instruction: optional timeout configuration | 24 |
| `tool-description-bash-verify-parent-directory.md` | Tool Description: Bash (verify parent directory) | Bash tool instruction: verify parent directory before creating files | 27 |
| `tool-description-bash-working-directory.md` | Tool Description: Bash (working directory) | Bash tool note about working directory persistence and shell state | 23 |
| `tool-description-browser-file-upload.md` | Tool Description: Browser file upload | Describes the browser file upload tool, which uploads shared files directly to a page file input by element ref and enforces the 10 MB combined size limit | 103 |
| `tool-description-browserbatch.md` | Tool Description: BrowserBatch | Tool description for BrowserBatch, which executes multiple browser tool calls sequentially in one round trip | 120 |
| `tool-description-chrome-browser-automation.md` | Tool Description: Chrome browser automation | Describes Chrome browser automation tools for page interaction, screenshots, console logs, and navigation | 41 |
| `tool-description-claude-ai-project.md` | Tool Description: claude.ai Project | Read and write the claude.ai Project bound to the session — a shared, persistent knowledge container — via project_info/read/search/write/delete methods, including knowledge-budget enforcement, the claude/ namespace default for agent-written docs, prompt-cache churn warnings, and treating doc contents as untrusted data | 429 |
| `tool-description-claude-in-chrome-bridge-disconnect-error.md` | Tool Description: Claude in Chrome bridge disconnect error | Error message shown when a Claude in Chrome tool call fails because the Chrome extension disconnects mid-operation | 62 |
| `tool-description-claude-in-chrome-bridge-timeout-error.md` | Tool Description: Claude in Chrome bridge timeout error | Error message shown when a Claude in Chrome tool does not respond before timing out | 53 |
| `tool-description-claude-in-chrome-find.md` | Tool Description: Claude in Chrome find | Describes the Claude in Chrome find tool for locating page elements by natural language or text content | 73 |
| `tool-description-claude-in-chrome-get-page-text.md` | Tool Description: Claude in Chrome get page text | Describes the Claude in Chrome get_page_text tool for extracting raw text content from a page | 41 |
| `tool-description-claude-in-chrome-javascript-tool.md` | Tool Description: Claude in Chrome JavaScript tool | Describes the Claude in Chrome JavaScript execution tool for running code in the current page context | 54 |
| `tool-description-claude-in-chrome-read-console-messages.md` | Tool Description: Claude in Chrome read console messages | Describes the Claude in Chrome read_console_messages tool for reading filtered browser console output | 70 |
| `tool-description-claude-in-chrome-read-network-requests.md` | Tool Description: Claude in Chrome read network requests | Describes the Claude in Chrome read_network_requests tool for inspecting HTTP requests made by the current page | 68 |
| `tool-description-claude-in-chrome-read-page.md` | Tool Description: Claude in Chrome read page | Describes the Claude in Chrome read_page tool for retrieving an accessibility tree of page elements | 82 |
| `tool-description-claude-in-chrome-shortcuts-execute.md` | Tool Description: Claude in Chrome shortcuts execute | Describes the Claude in Chrome shortcuts_execute tool for starting a shortcut or workflow in a side panel | 43 |
| `tool-description-claude-in-chrome-switch-browser.md` | Tool Description: Claude in Chrome switch browser | Describes the Claude in Chrome switch_browser tool for letting the user choose a browser from inside connected Chrome extensions | 67 |
| `tool-description-claude-in-chrome-tabs-context.md` | Tool Description: Claude in Chrome tabs context | Describes the Claude in Chrome tabs_context_mcp tool for retrieving the current MCP tab group context | 66 |
| `tool-description-claudedesign.md` | Tool Description: ClaudeDesign | Describes the ClaudeDesign tool for working with claude.ai/design projects, including project and file operations, previews, plan tokens, and live design output conventions | 254 |
| `tool-description-code-review-command.md` | Tool Description: Code review command | Describes the code review command and its effort levels, PR comment mode, and fix mode | 75 |
| `tool-description-computer-computer-batch.md` | Tool Description: Computer computer_batch | Describes the computer-use computer_batch tool for executing a sequence of computer actions in one call | 70 |
| `tool-description-computer-hold-key.md` | Tool Description: Computer hold_key | Describes the computer-use hold_key tool for pressing and holding keys or key combinations with allowlist and system-combo checks | 44 |
| `tool-description-computer-left-mouse-down.md` | Tool Description: Computer left_mouse_down | Describes the computer-use left_mouse_down tool for holding the left mouse button at the current cursor position | 56 |
| `tool-description-computer-left-mouse-up.md` | Tool Description: Computer left_mouse_up | Describes the computer-use left_mouse_up tool for releasing the left mouse button at the current cursor position | 48 |
| `tool-description-computer-request-access.md` | Tool Description: Computer request_access | Describes the computer-use request_access tool for asking user permission to control applications in the session | 64 |
| `tool-description-computer-type.md` | Tool Description: Computer type | Describes the computer-use type tool for entering text into the focused allowlisted application | 41 |
| `tool-description-computer-zoom.md` | Tool Description: Computer zoom | Describes the computer-use zoom tool for taking read-only higher-resolution screenshots of regions | 59 |
| `tool-description-computer.md` | Tool Description: Computer | Main description for the Chrome browser computer automation tool | 125 |
| `tool-description-cowork-onboarding-role-picker.md` | Tool Description: Cowork onboarding role picker | Describes the Cowork onboarding role-picker tool that returns a selected or typed role and should only be used while setting up Cowork for the user's job function | 136 |
| `tool-description-cowork-plugin-creation.md` | Tool Description: Cowork plugin creation | Describes the command for creating or customizing Cowork plugins for an organization | 57 |
| `tool-description-croncreate-durability-note.md` | Tool Description: CronCreate (durability note) | CronCreate insert (shown when durable-cron is enabled) explaining the durable: true vs false trade-off | 79 |
| `tool-description-croncreate.md` | Tool Description: CronCreate | Describes the CronCreate tool for enqueuing one-shot or recurring cron-based jobs with jitter and off-minute scheduling guidance | 456 |
| `tool-description-designsync.md` | Tool Description: DesignSync | Describes the DesignSync tool for reading and updating claude.ai/design design-system projects, including project listing, plan finalization, file writes and deletes, and asset registration | 572 |
| `tool-description-edit-minimal-old-string-guidance.md` | Tool Description: Edit minimal old_string guidance | Additional Edit guidance to keep old_string minimal and unique or use replace_all | 56 |
| `tool-description-edit-single-replacement.md` | Tool Description: Edit single replacement | Tool description for performing exact string replacement in a file, including prior-read and line-prefix requirements | 56 |
| `tool-description-edit.md` | Tool Description: Edit | Tool for performing exact string replacements in files | 118 |
| `tool-description-endconversation.md` | Tool Description: EndConversation | Defines when the assistant may use the EndConversation tool and the safety constraints that forbid ending the conversation | 755 |
| `tool-description-enterplanmode-ambiguous-tasks.md` | Tool Description: EnterPlanMode (ambiguous tasks) | Tool for entering plan mode when task has ambiguity | 62 |
| `tool-description-enterplanmode.md` | Tool Description: EnterPlanMode | Tool description for entering plan mode to explore and design implementation approaches | 548 |
| `tool-description-enterworktree.md` | Tool Description: EnterWorktree | Tool description for the EnterWorktree tool. | 526 |
| `tool-description-exitplanmode.md` | Tool Description: ExitPlanMode | Description for the ExitPlanMode tool, which presents a plan dialog for the user to approve | 324 |
| `tool-description-exitworktree.md` | Tool Description: ExitWorktree | Roughly, the reverse of the ExitWorktree | 316 |
| `tool-description-glob-compact.md` | Tool Description: Glob compact | Compact Glob tool description served to newer models — file pattern matching returning paths sorted by modification time | 19 |
| `tool-description-glob.md` | Tool Description: Glob | Tool description for file pattern matching and searching by name | 42 |
| `tool-description-grep-compact.md` | Tool Description: Grep compact | Compact Grep tool description served to newer models — ripgrep-backed content search preferred over raw grep/rg, with permission-UI integration | 67 |
| `tool-description-grep.md` | Tool Description: Grep | Tool description for content search using ripgrep | 130 |
| `tool-description-invoke-skill.md` | Tool Description: Invoke skill | Tool description for invoking available skills, including skill name selection, optional arguments, scoped skill names, and avoiding duplicate invocation when a skill is already loaded | 236 |
| `tool-description-listagents.md` | Tool Description: ListAgents | Describes the ListAgents tool, which lists agents you can message — in-process subagents, other local and cloud Claude sessions, and remote bridge sessions | 89 |
| `tool-description-listconnectors.md` | Tool Description: ListConnectors | Describes the ListConnectors tool for listing installed claude.ai MCP connectors, filtering by keyword, and interpreting org-level connection and chat-enabled status | 118 |
| `tool-description-listmcpresourcestool-prompt.md` | Tool Description: ListMcpResourcesTool prompt | Tool prompt for listing MCP resources and explaining the optional server parameter | 53 |
| `tool-description-listmcpresourcestool.md` | Tool Description: ListMcpResourcesTool | Tool description for listing available MCP resources from all configured servers or a specific server | 40 |
| `tool-description-lsp.md` | Tool Description: LSP | Description for the LSP tool. | 188 |
| `tool-description-memory-list-prompt.md` | Tool Description: memory_list prompt | Tool prompt for listing connected memory stores or store documents, paginating and narrowing listings, and directing content reads through memory_read | 108 |
| `tool-description-memory-write-prompt.md` | Tool Description: memory_write prompt | Describes creating or replacing connected memory-store documents with version checks, conflict handling, and secret-safety requirements | 217 |
| `tool-description-memory-write-update-triggers-and-timing.md` | Tool Description: memory_write update triggers and timing | Defines mandatory memory update triggers for user corrections, durable preferences, and non-transient environment discoveries, and requires writing before proceeding or finishing the turn | 346 |
| `tool-description-navigate.md` | Tool Description: Navigate | Describes the browser navigate tool for opening URLs and moving forward or backward in tab history | 102 |
| `tool-description-notebookedit.md` | Tool Description: NotebookEdit | Tool description for editing Jupyter notebook cells by replacing, inserting, or deleting a cell using cell IDs from the read tool | 105 |
| `tool-description-powershell.md` | Tool Description: PowerShell | Describes the PowerShell command execution tool with syntax guidance, timeout settings, and instructions to prefer specialized tools over PowerShell for file operations | 955 |
| `tool-description-pushnotification.md` | Tool Description: PushNotification | Tool description for PushNotification. This is a tool that sends a desktop notification in the user's terminal and pushes to their phone if Remote Control is connected. | 239 |
| `tool-description-readfile-compact.md` | Tool Description: ReadFile compact | Compact file-read tool description served to newer models — absolute path, default line cap, and image/PDF/notebook handling | 79 |
| `tool-description-readfile.md` | Tool Description: ReadFile | Tool description for reading files | 268 |
| `tool-description-readmcpresourcedirtool-prompt.md` | Tool Description: ReadMcpResourceDirTool prompt | Tool prompt for listing direct children of an MCP directory resource and explaining the required server and uri parameters | 79 |
| `tool-description-refreshmcptools-prompt.md` | Tool Description: RefreshMcpTools prompt | Tool prompt for refreshing one or all connected MCP servers tool lists and interpreting per-server results | 89 |
| `tool-description-refreshmcptools.md` | Tool Description: RefreshMcpTools | Describes when and how to refresh connected MCP servers tool lists to recover missing or stale tools | 161 |
| `tool-description-remotetrigger-prompt.md` | Tool Description: RemoteTrigger prompt | Tool prompt for calling the claude.ai RemoteTrigger API to list, get, create, update, or run remote routines and create webhook triggers for them | 187 |
| `tool-description-repl.md` | Tool Description: REPL | Describes the REPL tool, a JavaScript programming interface for looping, branching, and composing Claude Code tool calls as async functions | 345 |
| `tool-description-report-code-review-findings.md` | Tool Description: Report code-review findings | Tool description for reporting verified code-review findings as a typed list for host UI rendering | 90 |
| `tool-description-request-teach-access-part-of-teach-mode.md` | Tool Description: request_teach_access (part of teach mode) | Describes a tool that requests permission to guide the user through a task step-by-step using fullscreen tooltip overlays instead of direct access | 89 |
| `tool-description-schedulewakeup-delay-and-reason-guidance.md` | Tool Description: ScheduleWakeup delay and reason guidance | Extends the ScheduleWakeup tool description with no-op reporting, prompt-cache-aware delay selection, and concise reason-field guidance | 793 |
| `tool-description-searchmcpregistry.md` | Tool Description: SearchMcpRegistry | Describes the SearchMcpRegistry tool for discovering MCP connectors by keyword, including named-product and intent-based examples and install-state guidance | 179 |
| `tool-description-searchplugins.md` | Tool Description: SearchPlugins | Describes the SearchPlugins tool for finding relevant claude.ai org catalog plugins by keyword and suggesting install cards when results fit | 99 |
| `tool-description-searchskills.md` | Tool Description: SearchSkills | Describes the SearchSkills tool for finding relevant claude.ai skills by keyword and suggesting add cards when results fit | 100 |
| `tool-description-self-hosted-runner-requeue-session.md` | Tool Description: Self-hosted runner requeue session | Describes requeuing an assigned self-hosted runner session away from a failing runner and surfacing the equivalent Admin UI path | 80 |
| `tool-description-sendfeedback-drafting-guidance.md` | Tool Description: SendFeedback drafting guidance | Instructs when and how to queue concise, factual Claude Code feedback drafts with prescribed evidence bullets, field-selection rules, privacy constraints, and no user interruption or duplication | 518 |
| `tool-description-sendfile.md` | Tool Description: SendFile | Describes sending local files to peer, Remote Control, or cloud Claude Code sessions, including addressing, limits, integrity verification, and when to use shared-text messaging instead | 178 |
| `tool-description-sendmessage-cross-session-guidance.md` | Tool Description: SendMessage cross-session guidance | Explains cross-session SendMessage addressing, reply routing, liveness, disambiguation, and permission-laundering restrictions | 207 |
| `tool-description-sendmessage.md` | Tool Description: SendMessage | Describes the SendMessage tool for communicating with other agents and handling legacy team protocol responses | 205 |
| `tool-description-senduserfile.md` | Tool Description: SendUserFile | Describes the SendUserFile tool for surfacing generated deliverable files to the user, with optional captions and normal or proactive status | 234 |
| `tool-description-sendusermessage-verbatim.md` | Tool Description: SendUserMessage (verbatim) | Describes the concise SendUserMessage tool variant for sending verbatim user-visible messages with normal or proactive status | 62 |
| `tool-description-sendusermessage.md` | Tool Description: SendUserMessage | Describes the SendUserMessage tool for sending user-visible Markdown messages and attachments with normal or proactive status | 153 |
| `tool-description-showonboardingrolepicker.md` | Tool Description: ShowOnboardingRolePicker | ShowOnboardingRolePicker: presents a row of clickable role chips during Cowork onboarding | 22 |
| `tool-description-snooze-delay-and-reason-guidance.md` | Tool Description: Snooze (delay and reason guidance) | Extends the snooze tool description with guidance on choosing delaySeconds relative to the 5-minute prompt cache TTL and writing informative reason fields | 190 |
| `tool-description-suggestconnectors.md` | Tool Description: SuggestConnectors | Describes the SuggestConnectors tool for resolving SearchMcpRegistry directoryUuid values into full connector payloads and install-state guidance | 103 |
| `tool-description-suggestskills-proactive-guidance.md` | Tool Description: SuggestSkills proactive guidance | Guides proactive use of SuggestSkills to recommend addable standalone skills for repeatable tasks without interrupting one-off work | 163 |
| `tool-description-task-get.md` | Tool Description: Task Get | Retrieve a task by ID with full details and comments | 124 |
| `tool-description-taskcreate.md` | Tool Description: TaskCreate | Tool description for TaskCreate tool | 364 |
| `tool-description-tasklist-teammate-workflow.md` | Tool Description: TaskList (teammate workflow) | Conditional section appended to TaskList tool description | 85 |
| `tool-description-tasklist.md` | Tool Description: TaskList | Description for the TaskList tool, which lists all tasks in the task list | 163 |
| `tool-description-taskupdate.md` | Tool Description: TaskUpdate | Description for the TaskUpdate tool, which updates Claude's task list | 359 |
| `tool-description-todowrite-compact.md` | Tool Description: TodoWrite compact | Compact tool description for creating and updating a session task list with content, status, and activeForm fields | 66 |
| `tool-description-todowrite-proactive-update-guidance.md` | Tool Description: TodoWrite proactive update guidance | Concise TodoWrite guidance to proactively track progress with one in-progress task and activeForm values | 44 |
| `tool-description-todowrite.md` | Tool Description: TodoWrite | Tool description for creating and managing task lists | 1410 |
| `tool-description-toolsearch-second-part.md` | Tool Description: ToolSearch (second part) | The bulk of the tool description. | 114 |
| `tool-description-webfetch-concise.md` | Tool Description: WebFetch (concise) | Concise tool description for WebFetch covering URL fetching, private URL limitations, redirects, and caching | 87 |
| `tool-description-webfetch-private-url-warning.md` | Tool Description: WebFetch private URL warning | Warns that WebFetch fails for authenticated or private URLs and includes the standard WebFetch usage notes | 77 |
| `tool-description-webfetch.md` | Tool Description: WebFetch | Tool description for web fetch functionality | 220 |
| `tool-description-websearch-concise.md` | Tool Description: WebSearch (concise) | Describes the concise WebSearch tool variant with US-only results, current-month guidance, domain filters, and required sources | 49 |
| `tool-description-websearch.md` | Tool Description: WebSearch | Tool description for web search functionality | 201 |
| `tool-description-workflow.md` | Tool Description: Workflow | Describes the Workflow tool for running deterministic multi-subagent orchestration scripts, including opt-in requirements, script metadata, agent hooks, concurrency, budgeting, quality patterns, and resume behavior | 2814 |
| `tool-description-write-read-existing-file-first.md` | Tool Description: Write (read existing file first) | Tool description for Write in environments where existing files must be read before overwrite | 31 |
| `tool-description-write.md` | Tool Description: Write | Tool for writing files to the local filesystem | 83 |
| `tool-parameter-bash-run-in-background-guidance.md` | Tool Parameter: Bash run_in_background guidance | Explains Bash run_in_background behavior and that commands do not need a trailing ampersand | 67 |
| `tool-parameter-bash-run-in-background-note.md` | Tool Parameter: Bash run_in_background note | Notes that Bash commands can use run_in_background when the result is not needed immediately | 51 |
| `tool-parameter-claude-in-chrome-javascript-code.md` | Tool Parameter: Claude in Chrome JavaScript code | Describes the JavaScript code parameter for the Claude in Chrome JavaScript execution tool | 56 |
| `tool-parameter-computer-action.md` | Tool Parameter: Computer action | Action parameter options for the Chrome browser computer tool | 155 |
| `tool-parameter-matched-ask-rule.md` | Tool Parameter: matched ask rule | Describes metadata identifying a user-configured permissions.ask rule that forced a tool approval prompt while preserving the tool-authored decision reason | 74 |
| `tool-parameter-sendusermessage-attachments.md` | Tool Parameter: SendUserMessage attachments | Describes optional SendUserMessage attachments as local file paths or pre-resolved file objects | 46 |
| `tool-parameter-set-cwd-needs-trust-directory.md` | Tool Parameter: set_cwd needs_trust directory | Describes the canonical target directory returned by a set_cwd needs_trust response, which the SDK host must show in a trust dialog and echo back verbatim on accept | 69 |
