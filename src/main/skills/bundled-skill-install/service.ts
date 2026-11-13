import type {
  BundledSkillInstallResult,
  BundledSkillPlan
} from '../../../shared/bundled-skill-plan'
import { BUNDLED_SKILL_SOURCES } from './bundled-skill-sources'
import {
  autoUpdateBundledSkills,
  executeBundledSkillPlan,
  type BundledSkillExecuteInput
} from './execute'
import { nativeBundledSkillFilesystem } from './filesystem'
import { buildBundledSkillPlan } from './plan'

export type BundledSkillServiceInput = Omit<BundledSkillExecuteInput, 'filesystem' | 'sources'> &
  Partial<Pick<BundledSkillExecuteInput, 'filesystem' | 'sources'>>

function withDefaults(input: BundledSkillServiceInput): BundledSkillExecuteInput {
  return {
    ...input,
    filesystem: input.filesystem ?? nativeBundledSkillFilesystem,
    sources: input.sources ?? BUNDLED_SKILL_SOURCES
  }
}

export async function previewBundledSkillInstall(
  input: BundledSkillServiceInput
): Promise<BundledSkillPlan> {
  return (await buildBundledSkillPlan(withDefaults(input))).plan
}

// Coding Agent 2 shares skill folders with an installed Orca, whose skills carry these same names.
// The inherited installer stays off; Settings → Skills installs the app's copies under ca2- names.
const INHERITED_SKILL_WRITES_ENABLED = false

function skippedInstall(input: BundledSkillServiceInput): BundledSkillInstallResult {
  return { scope: input.destination.scope, skills: [] }
}

/** Execute by preview digest, never by client-supplied operations. */
export async function installBundledSkills(
  input: BundledSkillServiceInput,
  planDigest: string
): Promise<BundledSkillInstallResult> {
  if (!INHERITED_SKILL_WRITES_ENABLED) {
    return skippedInstall(input)
  }
  return executeBundledSkillPlan(withDefaults(input), planDigest)
}

/** Silent path: updates only hash-verified Coding Agent 2 copies of `names`, planned under the same locks. */
export async function autoUpdateInstalledBundledSkills(
  input: BundledSkillServiceInput & { names: readonly string[] }
): Promise<BundledSkillInstallResult> {
  if (!INHERITED_SKILL_WRITES_ENABLED) {
    return skippedInstall(input)
  }
  return autoUpdateBundledSkills({ ...withDefaults(input), names: input.names })
}
