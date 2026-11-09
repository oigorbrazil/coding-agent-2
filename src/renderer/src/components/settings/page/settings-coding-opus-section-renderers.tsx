import { CodingOpusPlaybooksPane } from '../coding-opus/CodingOpusPlaybooksPane'
import { FeaturesPane } from '../coding-opus/FeaturesPane'
import { SecondBrainPane } from '../coding-opus/SecondBrainPane'
import { SkillsPane } from '../coding-opus/SkillsPane'
import { SettingsSection } from '../section-layout/SettingsSection'
import { translate } from '@/i18n/i18n'
import type { Translate } from '@/i18n/use-translate'
import type { SettingsRenderContext } from './settings-render-context'

export function renderFeaturesSettingsSection(
  context: SettingsRenderContext,
  t: Translate = translate
): React.JSX.Element {
  const { navigation, view } = context
  return (
    <SettingsSection
      id="features"
      title={t('codingOpus.features.navTitle', 'Features')}
      description={t(
        'codingOpus.features.sectionDescription',
        'Everything Coding Agent 2 does. Open takes you to the setting behind each one.'
      )}
      searchEntries={navigation.getSectionSearchEntries('features')}
    >
      {view.isSectionMounted('features') ? <FeaturesPane /> : null}
    </SettingsSection>
  )
}

export function renderSkillsSettingsSection(
  context: SettingsRenderContext,
  t: Translate = translate
): React.JSX.Element | null {
  const { model, navigation, view } = context
  return model.showDesktopOnlySettings ? (
    <SettingsSection
      id="skills"
      title={t('codingOpus.skills.navTitle', 'Skills')}
      description={t(
        'codingOpus.skills.sectionDescription',
        'Pick where a skill goes: every project, or just one. Claude Code reads .claude/skills, Codex reads .agents/skills.'
      )}
      searchEntries={navigation.getSectionSearchEntries('skills')}
    >
      {view.isSectionMounted('skills') ? <SkillsPane /> : null}
    </SettingsSection>
  ) : null
}

export function renderCodingOpusPlaybooksSettingsSection(
  context: SettingsRenderContext,
  t: Translate = translate
): React.JSX.Element | null {
  const { model, navigation, view } = context
  return model.showDesktopOnlySettings ? (
    <SettingsSection
      id="coding-opus-playbooks"
      title={t('codingOpus.playbooks.navTitle', 'Playbooks')}
      description={t(
        'codingOpus.playbooks.sectionDescription',
        'The strategies Coding Opus plans and delegates with. Saved to the file the skill reads.'
      )}
      searchEntries={navigation.getSectionSearchEntries('coding-opus-playbooks')}
    >
      {view.isSectionMounted('coding-opus-playbooks') ? <CodingOpusPlaybooksPane /> : null}
    </SettingsSection>
  ) : null
}

export function renderSecondBrainSettingsSection(
  context: SettingsRenderContext,
  t: Translate = translate
): React.JSX.Element | null {
  const { model, navigation, view } = context
  return model.showDesktopOnlySettings ? (
    <SettingsSection
      id="second-brain"
      title={t('codingOpus.brain.navTitle', 'Second brain')}
      description={t(
        'codingOpus.brain.sectionDescription',
        'Browse, search and record notes through the skill’s brain.py.'
      )}
      searchEntries={navigation.getSectionSearchEntries('second-brain')}
    >
      {view.isSectionMounted('second-brain') ? <SecondBrainPane /> : null}
    </SettingsSection>
  ) : null
}
