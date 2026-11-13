import type { CommandSpec } from '../args'
import { LOCAL_COMMAND_FLAGS } from '../args'

const SELECTOR_NOTE =
  '--environment names a managed Coding Agent 2 server this machine deployed over SSH (see `coding environment list`); it is a selector here, not a routing flag.'
const DESKTOP_NOTE =
  'Runs on this machine’s Coding Agent 2 desktop app, the same action as Settings > Coding Agent 2 on your SSH hosts. A runtime without the SSH registry (headless `coding serve`) refuses it.'

export const MANAGED_SERVER_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['environment', 'status'],
    summary: 'Show a managed Coding Agent 2 server’s active version, terminals and pending work',
    usage: 'coding environment status --environment <selector> [--json]',
    allowedFlags: [...LOCAL_COMMAND_FLAGS, 'environment'],
    notes: [SELECTOR_NOTE, DESKTOP_NOTE],
    examples: ['coding environment status --environment build-box']
  },
  {
    path: ['environment', 'update'],
    summary: 'Update a managed Coding Agent 2 server to this build’s version',
    usage: 'coding environment update --environment <selector> [--force] [--json]',
    allowedFlags: [...LOCAL_COMMAND_FLAGS, 'environment', 'force'],
    notes: [
      'Without --force, an update that would restart over running terminals is deferred and reported, not applied.',
      SELECTOR_NOTE,
      DESKTOP_NOTE
    ],
    examples: ['coding environment update --environment build-box']
  },
  {
    path: ['environment', 'rollback'],
    destructive: true,
    summary: 'Roll a managed Coding Agent 2 server back to its previous version',
    usage: 'coding environment rollback --environment <selector> [--json]',
    allowedFlags: [...LOCAL_COMMAND_FLAGS, 'environment'],
    notes: [SELECTOR_NOTE, DESKTOP_NOTE]
  },
  {
    path: ['environment', 'recover'],
    summary:
      'Finish or undo a managed Coding Agent 2 server’s interrupted update, rollback or stop',
    usage:
      'coding environment recover --environment <selector> [--accept-changed-state --yes] [--json]',
    allowedFlags: [...LOCAL_COMMAND_FLAGS, 'environment', 'accept-changed-state', 'yes'],
    notes: [
      'When a rejected build changed profile state, recover refuses rather than restart the previous build over it. --accept-changed-state --yes restores the prelaunch snapshot instead, the same as Restore in Settings > Coding Agent 2 on your SSH hosts; what the rejected build changed is discarded.',
      SELECTOR_NOTE,
      DESKTOP_NOTE
    ],
    examples: [
      'coding environment recover --environment build-box',
      'coding environment recover --environment build-box --accept-changed-state --yes'
    ]
  },
  {
    path: ['environment', 'stop'],
    destructive: true,
    summary: 'Stop a managed Coding Agent 2 server and unlink it from this machine (decommission)',
    usage: 'coding environment stop --environment <selector> --yes [--json]',
    allowedFlags: [...LOCAL_COMMAND_FLAGS, 'environment', 'yes'],
    notes: [
      'Stops orcad on the SSH host and, once the host proves it exited, removes the server from this machine and disconnects the host. Its terminals end. Connecting the host again sets up a new server. Requires --yes.',
      'If the host cannot prove orcad exited, the server stays linked and the refusal says why; nothing is removed on a guess. For a host that is gone for good, use `coding environment forget`.',
      'If this server is the default host for new projects, choose another one first. `coding environment cancel-stop` withdraws a stop orcad has not acted on yet.',
      SELECTOR_NOTE,
      DESKTOP_NOTE
    ],
    examples: ['coding environment stop --environment build-box --yes']
  },
  {
    path: ['environment', 'forget'],
    destructive: true,
    summary: 'Unlink a managed Coding Agent 2 server whose SSH host is gone, without stopping it',
    usage: 'coding environment forget --environment <selector> --yes [--json]',
    allowedFlags: [...LOCAL_COMMAND_FLAGS, 'environment', 'yes'],
    notes: [
      'Removes the server from this machine without contacting its host, so the SSH host can then be removed. Use it when the host was deleted or can never be reached again. Requires --yes.',
      'Nothing on the host is stopped: if it comes back, orcad may still be running there.',
      'The SSH host is left disconnected, since no Coding Agent 2 server serves it any more. Connecting it again (Connect in Coding Agent 2) sets its server up again, relinking one still running there.',
      SELECTOR_NOTE,
      DESKTOP_NOTE
    ],
    examples: ['coding environment forget --environment build-box --yes']
  },
  {
    path: ['environment', 'cancel-stop'],
    summary: 'Withdraw a managed Coding Agent 2 server stop that orcad has not acted on yet',
    usage: 'coding environment cancel-stop --environment <selector> [--json]',
    allowedFlags: [...LOCAL_COMMAND_FLAGS, 'environment'],
    notes: [SELECTOR_NOTE, DESKTOP_NOTE]
  }
]
