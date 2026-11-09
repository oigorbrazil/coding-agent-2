import { ipcMain, shell } from 'electron'
import type {
  CodingOpusSkillTarget,
  SecondBrainRecordRequest,
  SkillCatalogScope
} from '../../shared/coding-opus'
import { codingOpusPlaybooksPath } from '../coding-opus/coding-opus-paths'
import {
  readCodingOpusPlaybooks,
  saveCodingOpusPlaybooks
} from '../coding-opus/coding-opus-playbooks'
import {
  findSecondBrainNotes,
  getSecondBrainOverview,
  installSecondBrain,
  readSecondBrainNote,
  recordSecondBrainNote
} from '../coding-opus/coding-opus-second-brain'
import {
  ensureCodingOpusSkillInstalled,
  getCodingOpusSkillStatus,
  installCodingOpusSkill
} from '../coding-opus/coding-opus-skill-install'

import {
  getSkillCatalogStatus,
  installCatalogSkill,
  removeCatalogSkill
} from '../coding-opus/coding-agent-skill-catalog'

const SKILL_TARGETS = new Set<CodingOpusSkillTarget>(['claude', 'codex'])

function parseTargets(targets: unknown): CodingOpusSkillTarget[] {
  const requested = Array.isArray(targets)
    ? targets.filter((entry): entry is CodingOpusSkillTarget => SKILL_TARGETS.has(entry))
    : []
  return requested.length > 0 ? requested : ['claude', 'codex']
}

function parseScope(scope: unknown): SkillCatalogScope {
  const value = scope as { kind?: unknown; projectPath?: unknown } | null
  if (value?.kind === 'project' && typeof value.projectPath === 'string' && value.projectPath) {
    return { kind: 'project', projectPath: value.projectPath }
  }
  return { kind: 'global' }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function registerCodingOpusHandlers(): void {
  ipcMain.handle('codingOpus:skillStatus', () => getCodingOpusSkillStatus())
  ipcMain.handle('codingOpus:installSkill', (_event, targets: unknown) => {
    const requested = Array.isArray(targets)
      ? targets.filter((entry): entry is CodingOpusSkillTarget => SKILL_TARGETS.has(entry))
      : undefined
    return installCodingOpusSkill(requested && requested.length > 0 ? requested : undefined)
  })

  ipcMain.handle('codingOpus:skillCatalog', (_event, scope: unknown) =>
    getSkillCatalogStatus(parseScope(scope))
  )
  ipcMain.handle(
    'codingOpus:installCatalogSkill',
    (_event, name: unknown, targets: unknown, scope: unknown) =>
      installCatalogSkill(String(name ?? ''), parseTargets(targets), parseScope(scope))
  )
  ipcMain.handle(
    'codingOpus:removeCatalogSkill',
    (_event, name: unknown, targets: unknown, scope: unknown) =>
      removeCatalogSkill(String(name ?? ''), parseTargets(targets), parseScope(scope))
  )

  ipcMain.handle('codingOpus:readPlaybooks', () => readCodingOpusPlaybooks())
  ipcMain.handle('codingOpus:savePlaybooks', (_event, text: unknown) =>
    typeof text === 'string'
      ? saveCodingOpusPlaybooks(text)
      : { ok: false as const, error: 'invalid-text' }
  )
  ipcMain.handle('codingOpus:revealPlaybooks', () => {
    shell.showItemInFolder(codingOpusPlaybooksPath())
  })

  ipcMain.handle('codingOpus:secondBrainOverview', () => getSecondBrainOverview())
  ipcMain.handle('codingOpus:secondBrainFind', (_event, query: unknown, route: unknown) =>
    findSecondBrainNotes(String(query ?? ''), typeof route === 'string' && route ? route : null)
  )
  ipcMain.handle('codingOpus:secondBrainRead', (_event, path: unknown) =>
    readSecondBrainNote(String(path ?? ''))
  )
  ipcMain.handle('codingOpus:secondBrainRecord', (_event, request: SecondBrainRecordRequest) =>
    recordSecondBrainNote({
      title: String(request?.title ?? ''),
      folder: String(request?.folder ?? ''),
      type: request?.type,
      summary: String(request?.summary ?? ''),
      tags: Array.isArray(request?.tags) ? request.tags.map(String) : []
    })
  )
  ipcMain.handle('codingOpus:secondBrainInstall', () => installSecondBrain())
  ipcMain.handle('codingOpus:secondBrainReveal', async (_event, path: unknown) => {
    const overview = await getSecondBrainOverview()
    if (overview.ok && overview.value.where.exists) {
      const target = typeof path === 'string' && path ? path : ''
      const note = target ? await readSecondBrainNote(target) : null
      if (note?.ok) {
        shell.showItemInFolder(`${overview.value.where.secondBrain}/${note.value.path}`)
      } else {
        void shell.openPath(overview.value.where.secondBrain)
      }
    }
  })

  // Same moment Orca refreshes its own bundled skills: keep /coding current for Claude Code and Codex.
  void ensureCodingOpusSkillInstalled().catch((error: unknown) => {
    console.warn('[coding-opus] Skill install failed:', errorMessage(error))
  })
}
