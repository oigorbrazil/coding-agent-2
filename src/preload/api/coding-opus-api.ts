import type {
  CodingOpusCommandResult,
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
  savePlaybooks: (text: string) => Promise<CodingOpusPlaybooksSaveResult>
  revealPlaybooks: () => Promise<void>
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
  removeCatalogSkill: (
    name: string,
    targets: CodingOpusSkillTarget[],
    scope: SkillCatalogScope
  ) => Promise<SkillCatalogStatus>
}
