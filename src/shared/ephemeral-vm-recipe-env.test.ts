import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { expect, it, vi } from 'vitest'
import { runRecipeCommand } from './ephemeral-vm-recipe-process'

it('exports matching new and legacy recipe context to the script', async () => {
  const child = Object.assign(new EventEmitter(), {
    pid: undefined,
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: vi.fn(),
    unref: vi.fn()
  })
  const spawnCommand = vi.fn(() => {
    queueMicrotask(() => child.emit('close', 0, null))
    return child
  })
  await runRecipeCommand({
    command: 'provision',
    repoPath: '/repo',
    mode: 'create',
    resultSchemaVersion: 2,
    context: {
      recipeId: 'recipe-1',
      instanceId: 'vm-1',
      projectId: 'project-1',
      workspaceId: 'workspace-1',
      workspaceName: 'feature',
      repoPath: '/repo',
      repoUrl: 'https://example.com/repo',
      branch: 'main',
      ref: 'refs/heads/main',
      expectedRefHead: 'abc',
      orcaVersion: '1.2.3'
    },
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: a test double for spawn; the code under test only uses pid, stdio, kill, unref and close.
    spawnCommand: spawnCommand as never
  })
  expect(spawnCommand.mock.calls[0]).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        env: expect.objectContaining({
          CODING_AGENT_VM_MODE: 'create',
          ORCA_VM_MODE: 'create',
          CODING_AGENT_VM_INSTANCE_ID: 'vm-1',
          ORCA_VM_INSTANCE_ID: 'vm-1',
          CODING_AGENT_RECIPE_ID: 'recipe-1',
          ORCA_RECIPE_ID: 'recipe-1',
          CODING_AGENT_PROJECT_ID: 'project-1',
          ORCA_PROJECT_ID: 'project-1',
          CODING_AGENT_WORKSPACE_ID: 'workspace-1',
          ORCA_WORKSPACE_ID: 'workspace-1',
          CODING_AGENT_WORKSPACE_NAME: 'feature',
          ORCA_WORKSPACE_NAME: 'feature',
          CODING_AGENT_REPO_PATH: '/repo',
          ORCA_REPO_PATH: '/repo',
          CODING_AGENT_REPO_URL: 'https://example.com/repo',
          ORCA_REPO_URL: 'https://example.com/repo',
          CODING_AGENT_REPO_BRANCH: 'main',
          ORCA_REPO_BRANCH: 'main',
          CODING_AGENT_REPO_REF: 'refs/heads/main',
          ORCA_REPO_REF: 'refs/heads/main',
          CODING_AGENT_REPO_REF_HEAD: 'abc',
          ORCA_REPO_REF_HEAD: 'abc',
          CODING_AGENT_RECIPE_RESULT_SCHEMA_VERSION: '2',
          ORCA_RECIPE_RESULT_SCHEMA_VERSION: '2',
          CODING_AGENT_VERSION: '1.2.3',
          ORCA_VERSION: '1.2.3'
        })
      })
    ])
  )
})
