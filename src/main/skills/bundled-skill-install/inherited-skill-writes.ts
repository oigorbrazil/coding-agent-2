import type { BundledSkillInstallResult } from '../../../shared/bundled-skill-plan'

// Coding Agent 2 shares skill folders with an installed Orca, whose skills carry these same names.
// The inherited installer stays off; Settings → Skills installs the app's copies under ca2- names.
export const INHERITED_SKILL_WRITES_ENABLED = false

export function skippedBundledSkillInstall(
  scope: BundledSkillInstallResult['scope']
): BundledSkillInstallResult {
  return { scope, skills: [] }
}
