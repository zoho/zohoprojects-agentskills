# Zoho Projects plugin for Antigravity, Claude Code and Cursor

Work with Zoho Projects from your coding agent: find and update tasks and issues, log time, and review project health. The plugin connects the agent to the Zoho Projects MCP server and adds skills, rules and a safety hook so the agent uses the tools correctly and confirms changes before making them.

One repository serves three hosts. Each host reads its own manifest and shares the same `skills/` folder and guard script.

| Host | Manifest | MCP config | Hooks |
|------|----------|------------|-------|
| Google Antigravity | `.antigravity-plugin/plugin.json` | `mcp_config.json` | `hooks.json` |
| Claude Code | `.claude-plugin/plugin.json` (marketplace: `.claude-plugin/marketplace.json`) | inline `mcpServers` | `hosts/claude/hooks.json` |
| Cursor | `.cursor-plugin/plugin.json` (+ `marketplace.json`) | inline `mcpServers` | none (Cursor's built-in MCP approval) |

## Install

### Google Antigravity

In Antigravity, open **Customizations > Plugins > Install from URL** and paste `https://github.com/zoho/zohoprojects-agentskills`.

Or install from a local checkout:

```bash
git clone https://github.com/zoho/zohoprojects-agentskills.git
agy plugin install ./zohoprojects-agentskills
```

The plugin connects to the US data center server (`https://zprojects.zohomcp.com/mcp/message`) and works right after install. If your Zoho account is in another data center, see [Data centers](#data-centers).

### Claude Code

```text
/plugin marketplace add zoho/zohoprojects-agentskills
/plugin install zoho-projects@zoho-projects
```

You can also pass a git URL or a local path to a clone instead of `zoho/zohoprojects-agentskills`. When the plugin is enabled, Claude Code asks for the **Zoho data center** (`zoho_dc`) and offers the list of values, with `com` as the default. To change it later, open `/config` and pick a new value for the plugin's `zoho_dc` option.

### Cursor

Install **zoho-projects** from the Cursor Marketplace once it is published there, or import this repository (it ships `.cursor-plugin/marketplace.json`) into a team marketplace and install it from **Customize**. Set the **Zoho data center** (`ZOHO_DC`) in the dashboard under **Plugins > Configure**. It accepts the same values (`com` by default).

### Data centers

Zoho runs a separate Zoho Projects MCP server in each data center. Use the one that matches the address you sign in to Zoho Projects at. Signing in on the wrong one shows the wrong account or no portals.

| Data center | You sign in at | MCP server URL | Value |
|-------------|----------------|----------------|-------|
| United States | projects.zoho.com | `https://zprojects.zohomcp.com/mcp/message` | `com` |
| Europe | projects.zoho.eu | `https://zprojects.zohomcp.eu/mcp/message` | `eu` |
| India | projects.zoho.in | `https://zprojects.zohomcp.in/mcp/message` | `in` |
| Australia | projects.zoho.com.au | `https://zprojects.zohomcp.com.au/mcp/message` | `com.au` |
| Canada | projects.zohocloud.ca | `https://zprojects.zohomcp.ca/mcp/message` | `ca` |
| Saudi Arabia | projects.zoho.sa | `https://zprojects.zohomcp.sa/mcp/message` | `sa` |
| Japan | projects.zoho.jp | `https://zprojects.zohomcp.jp/mcp/message` | `jp` |
| United Arab Emirates | projects.zoho.ae | `https://zprojects.zohomcp.ae/mcp/message` | `ae` |
| United Kingdom | projects.zoho.uk | `https://zprojects.zohomcp.uk/mcp/message` | `uk` |

How to switch:

- **Antigravity:** the plugin ships the US URL. For another data center, edit `serverUrl` in the installed plugin's `mcp_config.json` (under `~/.gemini/config/plugins/zoho-projects/`) to the URL from the table, then reload the plugin. A plugin update replaces this file, so repeat the edit after updating.
- **Claude Code:** pick the value from the table for the plugin's `zoho_dc` option when you enable it, or later in `/config`.
- **Cursor:** set `ZOHO_DC` to the value from the table under **Plugins > Configure**.

### First run (all hosts)

On the first Zoho Projects tool call, a browser window opens for Zoho sign-in (OAuth). Approve access. No API keys are stored in the plugin. Antigravity connects to the server URL directly and handles the sign-in itself. Claude Code and Cursor connect through `mcp-remote`; Claude Code keeps the sign-in token in the plugin's private data folder (`mcp-auth` inside `${CLAUDE_PLUGIN_DATA}`), and Cursor, which has no plugin data folder, uses the `mcp-remote` default (`~/.mcp-auth`).

## Try it

After install and sign-in, start with one of these prompts (Antigravity shows them as chips on the plugin page; in Claude Code and Cursor, type them in chat):

- "Show my open tasks and issues in Zoho Projects."
- "Help me implement a Zoho Projects task or fix an issue in this repository."
- "Update my task with the changes made and tests performed and log 2 hours today for it."

## Requirements

- Google Antigravity, Claude Code or Cursor with plugin support.
- Node.js 18 or later on the `PATH` (bundled with Antigravity). The safety hook runs with `node`; Claude Code and Cursor also run the MCP connection through `npx mcp-remote`.
- A Zoho Projects account.

## Components

| Component | File | Purpose |
|-----------|------|---------|
| MCP server | `mcp_config.json`, inline `mcpServers` in the Claude Code and Cursor manifests | Connects to the Zoho Projects MCP server for your data center. Server key `mcp` on every host (shown as `zoho-projects_mcp` in Antigravity, `plugin:zoho-projects:mcp` in Claude Code). |
| Skills | `skills/` | Shared by all three hosts. |
| Always-on rules | `rules/AGENTS.md` | Load the `zoho-projects` skill first, use only real IDs, confirm before changes, factual reporting, prompt-injection safety. |
| Task filter rules | `rules/task-filters.md` | The most common task filter mistakes, with a pointer to the tasks skill. Loaded when relevant. |
| Time log rules | `rules/time-logs.md` | Time logging guardrails (no invented hours, duplicate check, hour format), with a pointer to the timelogs skill. Loaded when relevant. |
| Safety hook | `hooks.json`, `hosts/claude/hooks.json`, `scripts/guard-destructive.mjs` | Asks for confirmation before any Zoho Projects tool that deletes, trashes, removes, unlinks, disassociates or deactivates data. Tools from other MCP servers are left alone. In Antigravity every MCP call reaches the hook as `call_mcp_tool`; the script reads the real tool name, answers `force_ask` (always prompt) for destructive tools and `ask` (the normal approval flow) for the rest. In Claude Code the hook matches only destructive Zoho Projects tools and answers `ask`. Cursor has no hook and relies on its built-in MCP approval. Keep tool approval on. |

### Skills

`zoho-projects` is the entry skill. It handles connection, portal and project context, users and fields, and routes each request to a module skill.

| Skill | Covers |
|-------|--------|
| `zoho-projects` | Connection, data center, portals and projects, users, fields and options, followers, attachments, trash |
| `zoho-projects-tasks` | Tasks, subtasks, filters, dependencies, comments, followers, attachments |
| `zoho-projects-issues` | Issues, filters, links, issue-task associations, comments, resolutions |
| `zoho-projects-phases` | Phases (milestones) and phase comments |
| `zoho-projects-projects` | Finding, creating and updating projects, templates, archive, trash, restore, delete, history, comments |
| `zoho-projects-tasklists` | Task lists, templates, comments, followers |
| `zoho-projects-timelogs` | Time logs on tasks, issues and general work |
| `zoho-projects-users-groups` | Project users, client users, profiles, roles, project groups |
| `zoho-projects-tags` | Tags and tagging records |
| `zoho-projects-custom-views` | Saved, favourite and default views |
| `zoho-projects-custom-modules` | Custom modules and records |
| `zoho-projects-layouts-fields` | Layouts, fields, sections, picklist options |
| `zoho-projects-blueprints` | Blueprint transitions |

### Agents

Coming soon.

## Safety

- **Keep tool approval on.** Review each change the agent proposes before approving it. The safety hook adds an extra confirmation for destructive tools, but it is not a substitute for reviewing the request.
- **Prompt injection.** Task descriptions, comments and attachments can contain text written by anyone with access to your portal. The rules tell the agent to treat that text as data, but stay alert to unexpected actions.
- **Revoking access.** Remove the plugin to stop access. You can also revoke the connection from your Zoho account's connected apps settings.
- **API limits.** MCP calls count against the same limits as the Zoho Projects V3 REST API for your portal.

## Development

```bash
npm test                  # run the hook tests (no dependencies needed)
agy plugin validate .     # validate the Antigravity plugin
claude plugin validate .  # validate the Claude Code plugin and marketplace
```

The destructive-tool pattern lives in `scripts/guard-destructive.mjs` and is also the `matcher` in `hosts/claude/hooks.json`; a test checks that they agree. Antigravity's `hooks.json` matches `call_mcp_tool` and leaves the decision to the script. Tests also check that every manifest parses and that all manifests share the same name and version, so bump `version` in all three together.

## License

Apache License 2.0. See [LICENSE](LICENSE).
