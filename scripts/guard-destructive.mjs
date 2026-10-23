#!/usr/bin/env node
// Pre-tool guard shared by Antigravity and Claude Code: asks for
// confirmation before Zoho Projects tools that permanently remove or detach
// data. Never blocks on bad input; always exits 0.
//
// Usage: node guard-destructive.mjs [--host antigravity|claude]
//
// Cursor ships no hook: its beforeMCPExecution matcher target is undocumented,
// and its neutral reply is an explicit allow that could bypass Cursor's own
// MCP approval. Cursor relies on its built-in approval instead.

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Matches Zoho Projects MCP tools (named ZohoProjects_<action>, with any host
// prefix in front) whose action deletes, trashes, removes, unlinks,
// disassociates or deactivates data. Tools from other servers never match.
// Keep in sync with the matcher in hosts/claude/hooks.json.
export const DESTRUCTIVE_TOOL_PATTERN_SOURCE =
  'ZohoProjects_(?:[a-z0-9_]*_)?(?:delete|trash|deactivate|disassociate|dissociate|remove|unlink)_|ZohoProjects_move_entities_to_trash';

export const DESTRUCTIVE_TOOL_PATTERN = new RegExp(DESTRUCTIVE_TOOL_PATTERN_SOURCE);

export const HOSTS = Object.freeze(['antigravity', 'claude']);
export const DEFAULT_HOST = 'antigravity';

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const nonEmptyString = (value) => (typeof value === 'string' && value.length > 0 ? value : undefined);

// Antigravity sends every MCP call to PreToolUse as
// {"toolCall": {"name": "call_mcp_tool", "args": {"ServerName", "ToolName", "Arguments"}}}
// (captured from agy 1.4.6). Claude Code (PreToolUse) documents `tool_name`.
const TOOL_NAME_READERS = {
  antigravity: (event) => {
    const call = event.toolCall;
    if (!isObject(call) || call.name !== 'call_mcp_tool' || !isObject(call.args)) return undefined;
    return nonEmptyString(call.args.ToolName);
  },
  claude: (event) => nonEmptyString(event.tool_name),
};

const resolveHost = (host) => (HOSTS.includes(host) ? host : DEFAULT_HOST);

export function parseHost(argv) {
  const args = Array.isArray(argv) ? argv : [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--host') return resolveHost(args[i + 1]);
    if (typeof arg === 'string' && arg.startsWith('--host=')) return resolveHost(arg.slice('--host='.length));
  }
  return DEFAULT_HOST;
}

export function getToolName(event, host = DEFAULT_HOST) {
  if (!isObject(event)) return undefined;
  return TOOL_NAME_READERS[resolveHost(host)](event);
}

// Host-neutral decision: {} to stay out of the way, or { decision, reason }.
export function evaluate(event, host = DEFAULT_HOST) {
  const toolName = getToolName(event, host);
  if (!toolName || !DESTRUCTIVE_TOOL_PATTERN.test(toolName)) return {};
  return {
    decision: 'ask',
    reason:
      `${toolName} permanently removes or detaches Zoho Projects data. ` +
      'Confirm the exact records and the change before allowing it.',
  };
}

const OUTPUT_FORMATTERS = {
  // force_ask always prompts, even when the user chose "Always Allow".
  antigravity: (result) => ({ decision: 'force_ask', reason: result.reason }),
  claude: (result) => ({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: result.decision,
      permissionDecisionReason: result.reason,
    },
  }),
};

// Antigravity denies the call when a PreToolUse hook returns no decision, so its
// neutral reply is "ask": the normal approval flow, which honors "Always Allow".
const NEUTRAL_OUTPUT = {
  antigravity: () => ({ decision: 'ask' }),
  claude: () => ({}),
};

export function formatOutput(result, host = DEFAULT_HOST) {
  const resolved = resolveHost(host);
  if (!isObject(result) || result.decision !== 'ask') return NEUTRAL_OUTPUT[resolved]();
  return OUTPUT_FORMATTERS[resolved](result);
}

function parseEvent(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const host = parseHost(process.argv.slice(2));
  let result = {};
  try {
    result = evaluate(parseEvent(await readStdin()), host);
  } catch {
    result = {};
  }
  process.stdout.write(`${JSON.stringify(formatOutput(result, host))}\n`);
  process.exitCode = 0;
}

function isDirectRun() {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main();
}
