/** Agents the Coding Opus skill installs into, following the bundled-skill roots. */
export type CodingOpusSkillTarget = 'claude' | 'codex'

export type CodingOpusSkillTargetStatus = {
  target: CodingOpusSkillTarget
  /** Folder the skill lives in for this agent. */
  path: string
  /** `metadata.version` of the installed SKILL.md, or null when absent. */
  installedVersion: string | null
  /** Installed by this app (sidecar present) rather than by hand or another tool. */
  managed: boolean
}

export type CodingOpusSkillStatus = {
  bundledVersion: string
  bundledCommit: string
  targets: CodingOpusSkillTargetStatus[]
}

export type CodingOpusPlaybooks = {
  text: string
  path: string
  /** False while the bundled playbooks stand in for a file the person never saved. */
  custom: boolean
}

export type CodingOpusPlaybooksSaveResult =
  | { ok: true; playbooks: CodingOpusPlaybooks }
  | { ok: false; error: string }

export type SecondBrainWhere = {
  secondBrain: string
  exists: boolean
  documents: string | null
}

export type SecondBrainNoteSummary = {
  /** Path relative to the second brain root, with forward slashes. */
  path: string
  title: string
  type: string | null
  status: string | null
  tags: string[]
  updated: string | null
  modifiedMs: number
}

export type SecondBrainFolder = {
  name: string
  notes: number
}

export type SecondBrainOverview = {
  where: SecondBrainWhere
  folders: SecondBrainFolder[]
  recent: SecondBrainNoteSummary[]
  totalNotes: number
}

export type SecondBrainFindHit = {
  path: string
  title: string
  type: string | null
  status: string | null
  updated: string | null
  tags: string[]
  /** Where brain.py matched the terms: title, tags, alias or body. */
  match: string | null
}

export type SecondBrainNote = {
  path: string
  text: string
}

export type SecondBrainNoteType = 'nota' | 'decisao' | 'estudo' | 'ideia' | 'meeting'

export type SecondBrainRecordRequest = {
  title: string
  folder: string
  type: SecondBrainNoteType
  summary: string
  tags: string[]
}

/** Where a skill goes: the agents' global skill folders, or one project's. */
export type SkillCatalogScope = { kind: 'global' } | { kind: 'project'; projectPath: string }

export type SkillCatalogEntry = {
  name: string
  title: string
  description: string
  version: string | null
  origin: 'coding-opus' | 'app'
}

export type SkillCatalogInstall = {
  name: string
  target: CodingOpusSkillTarget
  path: string
  /** `managed`: installed by this app; `external`: same name put there by hand or another tool. */
  state: 'missing' | 'managed' | 'external'
  version: string | null
}

export type SkillCatalogStatus = {
  scope: SkillCatalogScope
  entries: SkillCatalogEntry[]
  installs: SkillCatalogInstall[]
}

export type CodingOpusCommandResult<T> = { ok: true; value: T } | { ok: false; error: string }
