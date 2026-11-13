import type { CommandSpec } from '../args'
import { GLOBAL_FLAGS } from '../args'

export const PORTS_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['ports'],
    summary: 'List the listening ports Coding Agent 2 detected for a workspace',
    usage: 'coding ports [--worktree <selector>] [--all] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'worktree', 'all'],
    notes: [
      'Defaults to the Coding Agent 2 workspace that contains the current directory.',
      'Scans the host the workspace runs on and lists the ports Coding Agent 2 tied to it, by process working directory (match=cwd) or command line (match=command).',
      '--all lists every listener found on that host, including other workspaces and processes Coding Agent 2 could not tie to one. A native folder workspace needs --all, because Coding Agent 2 does not tie ports to folders.',
      'url is the address the dev server printed in a Coding Agent 2 terminal; it is missing when Coding Agent 2 did not see one.'
    ],
    examples: [
      'coding ports',
      'coding ports --worktree branch:feature/login --json',
      'coding ports --all',
      "coding ports --json | jq -r '.result.ports[0].advertisedUrl'"
    ]
  }
]
