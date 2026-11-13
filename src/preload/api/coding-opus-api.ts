import type {
  CodingOpusAccountProvider,
  CodingOpusAccountsResult,
  CodingOpusCommandResult,
  CodingOpusModelCatalogResult,
  CodingOpusPlaybooks,
  CodingOpusPlaybooksSaveResult,
  CodingOpusSkillStatus,
  CodingOpusSkillTarget,
  SecondBrainFindHit,
  SecondBrainNote,
  SecondBrainOverview,
  SecondBrainRecordRequest,
  SkillCatalogScope,
  SkillCatalogStatus
} from '../../shared/coding-opus'

export type CodingOpusApi = {
  skillStatus: () => Promise<CodingOpusSkillStatus>
  installSkill: (targets?: CodingOpusSkillTarget[]) => Promise<CodingOpusSkillStatus>
  readPlaybooks: () => Promise<CodingOpusPlaybooks>
  /** Newest modification time across every copy of the playbooks file. */
  playbooksStamp: () => Promise<number>
  savePlaybooks: (text: string) => Promise<CodingOpusPlaybooksSaveResult>
  revealPlaybooks: () => Promise<void>
  /** Accounts Coding Opus workers rotate through when one hits its usage limit. */
  readAccounts: () => Promise<CodingOpusAccountsResult>
  orderAccounts: (
    provider: CodingOpusAccountProvider,
    names: string[]
  ) => Promise<CodingOpusAccountsResult>
  /** Models each provider offers now, for the editor's "Update models". */
  modelCatalog: () => Promise<CodingOpusModelCatalogResult>
  secondBrainOverview: () => Promise<CodingOpusCommandResult<SecondBrainOverview>>
  secondBrainFind: (
    query: string,
    route?: string | null
  ) => Promise<CodingOpusCommandResult<SecondBrainFindHit[]>>
  secondBrainRead: (path: string) => Promise<CodingOpusCommandResult<SecondBrainNote>>
  secondBrainRecord: (request: SecondBrainRecordRequest) => Promise<CodingOpusCommandResult<string>>
  secondBrainInstall: () => Promise<CodingOpusCommandResult<string>>
  secondBrainReveal: (path?: string) => Promise<void>
  skillCatalog: (scope: SkillCatalogScope) => Promise<SkillCatalogStatus>
  installCatalogSkill: (
    name: string,
    targets: CodingOpusSkillTarget[],
    scope: SkillCatalogScope
  ) => Promise<SkillCatalogStatus>
  /** Picks a folder with SKILL.md and copies it into the app's skill library; null when cancelled. */
  loadSkillFolder: () => Promise<CodingOpusCommandResult<string | null>>
  forgetLibrarySkill: (name: string) => Promise<void>
  removeCatalogSkill: (
    name: string,
    targets: CodingOpusSkillTarget[],
    scope: SkillCatalogScope
  ) => Promise<SkillCatalogStatus>
}
