import { type RuntimeClient, RuntimeClientError } from '../runtime-client'
import { type ParentEnvironment, resolveParentEnvironment } from './worktree-parent-environment'
import { readAppEnv } from '../../shared/app-env'
import { isWorkspaceKey, worktreeWorkspaceKey } from '../../shared/workspace-scope'
import { getOptionalStringFlag } from '../flags'

import { getOptionalParentSelector } from '../caller-folder-workspace'

export type CreateParentSelector = {
  parentWorktree?: string
  parentWorkspace?: string
  /** The parent is in another environment than the child, resolved there and sent as a ref. */
  parentEnvironment?: ParentEnvironment
}

const CREATE_PARENT_CONFLICT_MESSAGE = 'Choose either one parent selector or --no-parent.'

export function assertWorktreeParentFlagsCompatible(
  flags: Map<string, string | boolean>,
  conflictMessage: string = CREATE_PARENT_CONFLICT_MESSAGE
): void {
  if (flags.has('parent-worktree') && flags.get('no-parent') === true) {
    throw new RuntimeClientError('invalid_argument', conflictMessage)
  }
  const parentWorktree = flags.get('parent-worktree')
  if (
    flags.has('parent-worktree') &&
    (typeof parentWorktree !== 'string' || parentWorktree === '')
  ) {
    throw new RuntimeClientError('invalid_argument', 'Missing required --parent-worktree')
  }
}

export function getWorkspaceKeyParentSelector(selector: string): string | undefined {
  const rawSelector = selector.startsWith('id:') ? selector.slice('id:'.length) : selector
  return isWorkspaceKey(rawSelector) ? rawSelector : undefined
}

export async function resolveCreateParentSelector(
  flags: Map<string, string | boolean>,
  cwd: string,
  client: RuntimeClient
): Promise<CreateParentSelector> {
  const parentEnvironment = resolveParentEnvironment(flags, client)
  const rawParentWorktree = getOptionalStringFlag(flags, 'parent-worktree')
  if (!rawParentWorktree) {
    return {}
  }
  if (parentEnvironment) {
    return { parentWorktree: rawParentWorktree, parentEnvironment }
  }

  const parentWorkspace = getWorkspaceKeyParentSelector(rawParentWorktree)
  if (parentWorkspace) {
    // The public parent flag can name either kind; runtime workspace keys preserve folder lineage.
    return { parentWorkspace }
  }

  const parentWorktree = await getOptionalParentSelector(flags, cwd, client)
  const resolvedParentWorkspace = parentWorktree
    ? getWorkspaceKeyParentSelector(parentWorktree)
    : undefined
  if (resolvedParentWorkspace) {
    // active/current can resolve to a folder workspace.
    return { parentWorkspace: resolvedParentWorkspace }
  }

  return {
    parentWorktree
  }
}

export function getEnvParentWorkspace(): string | undefined {
  const workspaceId = readAppEnv(process.env, 'WORKSPACE_ID')
  if (typeof workspaceId === 'string' && isWorkspaceKey(workspaceId)) {
    return workspaceId
  }
  const worktreeId = readAppEnv(process.env, 'WORKTREE_ID')
  if (typeof worktreeId === 'string' && worktreeId.length > 0) {
    return isWorkspaceKey(worktreeId) ? worktreeId : worktreeWorkspaceKey(worktreeId)
  }
  return undefined
}
