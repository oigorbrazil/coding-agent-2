import type { CommandSpec } from '../args'
import { GLOBAL_FLAGS, LOCAL_COMMAND_FLAGS } from '../args'

export const ENVIRONMENT_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['host', 'name'],
    summary: 'Show or set the name this Coding Agent 2 runtime reports to connected clients',
    usage: 'coding host name [--name <name>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'name'],
    notes: [
      'With --name, updates the answering runtime over its authenticated connection. Use an empty value to return to the detected computer name.',
      'Without --name, prints the name and platform the answering runtime reports.'
    ],
    examples: ['coding host name', 'coding host name --name build-server']
  },
  {
    path: ['host', 'list'],
    summary: 'List every machine this Coding Agent 2 host can target, and how to name each one',
    usage: 'coding host list [--json]',
    allowedFlags: [...LOCAL_COMMAND_FLAGS],
    notes: [
      'Answers "what can I target and what do I pass" in one place: this machine, the SSH targets registered on it, and the Coding Agent 2 servers paired with it.',
      'The three kinds are reached differently. A paired Coding Agent 2 server is a connection, selected with --environment <name>. An SSH target is a machine the connected Coding Agent 2 host reaches, selected with --host ssh:<id>. Passing one where the other belongs is the most common way to get an empty or missing-host answer.',
      'Commands that take --host also accept any name this list prints, such as --host "this machine" or --host <ssh-target-name> (except `coding host rm`, which takes only the ssh:<target-id> form). A name two hosts share is refused with the exact flag for each.',
      'SSH rows include the detected remote platform after that target has connected (linux, darwin, or win32); disconnected or older targets report platform unknown.',
      'SSH rows also include whether the target is currently connected and its lifecycle status when known.',
      'Paired-server rows come from the pairing store and report platform unknown; ask one server directly with `coding host name --environment <name>`.',
      "SSH targets are read from this machine's own Coding Agent 2 runtime, so this lists that machine's targets and not another server's. Run `coding host list` on the other machine to see the targets registered there.",
      '--environment and --pairing-code are rejected rather than ignored: paired servers come from this machine\u2019s pairing store, so a routed answer would describe two machines at once.'
    ],
    examples: ['coding host list', 'coding host list --json']
  },
  {
    path: ['host', 'rm'],
    destructive: true,
    summary: 'Remove one saved SSH target from this Coding Agent 2 host',
    usage: 'coding host rm --host ssh:<target-id> [--json]',
    allowedFlags: [...LOCAL_COMMAND_FLAGS, 'host'],
    notes: [
      'Removes the target the same way Settings does: its connection closes, and the passive ~/.ssh/config import does not add the alias back. Restore removed hosts in Settings brings it back.',
      'Takes only the --host ssh:<target-id> form that `coding host list` prints. This machine and paired Coding Agent 2 servers are refused; remove a paired server with `coding environment rm`.',
      '--environment and --pairing-code are rejected rather than ignored: SSH targets are removed from this machine\u2019s own Coding Agent 2 runtime.'
    ],
    examples: [
      'coding host rm --host ssh:ssh-1783599077486-fyasux',
      'coding host rm --host ssh:ssh-1783599077486-fyasux --json'
    ]
  },
  {
    path: ['environment', 'add'],
    summary: 'Save a remote Coding Agent 2 runtime environment from a pairing code',
    usage: 'coding environment add --name <name> --pairing-code <code> [--json]',
    allowedFlags: [...LOCAL_COMMAND_FLAGS, 'pairing-code', 'name'],
    examples: [
      'coding environment add --name work-laptop --pairing-code codingagent2://pair?code=...'
    ]
  },
  {
    path: ['environment', 'list'],
    summary: 'List saved Coding Agent 2 runtime environments',
    usage: 'coding environment list [--json]',
    allowedFlags: [...LOCAL_COMMAND_FLAGS],
    notes: [
      'Answers from this machine\u2019s pairing store. --environment and --pairing-code are rejected rather than ignored, because there is no other host that could answer.'
    ]
  },
  {
    path: ['environment', 'show'],
    summary: 'Show one saved Coding Agent 2 runtime environment',
    usage: 'coding environment show --environment <selector> [--json]',
    allowedFlags: [...LOCAL_COMMAND_FLAGS, 'environment']
  },
  {
    path: ['environment', 'rm'],
    destructive: true,
    summary: 'Remove one saved Coding Agent 2 runtime environment',
    usage: 'coding environment rm --environment <selector> [--json]',
    allowedFlags: [...LOCAL_COMMAND_FLAGS, 'environment']
  }
]
