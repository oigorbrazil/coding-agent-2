import { AccountPane } from '../coding-opus/AccountPane'
import { CodingOpusPlaybooksPane } from '../coding-opus/CodingOpusPlaybooksPane'
import { LanguagePane } from '../coding-opus/LanguagePane'
import { SecondBrainPane } from '../coding-opus/SecondBrainPane'
import { SkillsPane } from '../coding-opus/SkillsPane'
import { SettingsSection } from '../section-layout/SettingsSection'
import { translate } from '@/i18n/i18n'
import type { Translate } from '@/i18n/use-translate'
import type { SettingsRenderContext } from './settings-render-context'

export function renderAccountSettingsSection(
  context: SettingsRenderContext,
  t: Translate = translate
): React.JSX.Element | null {
  const { model, navigation, view } = context
  return model.showDesktopOnlySettings ? (
    <SettingsSection
      id="account"
      title={t('codingOpus.account.navTitle', 'Account')}
      description={t(
        'codingOpus.account.sectionDescription',
        'Your local profile, the email linked to it and the sign-in server.'
      )}
      searchEntries={navigation.getSectionSearchEntries('account')}
    >
      {view.isSectionMounted('account') ? <AccountPane /> : null}
    </SettingsSection>
  ) : null
}

export function renderLanguageSettingsSection(
  context: SettingsRenderContext,
  t: Translate = translate
): React.JSX.Element {
  const { model, navigation, view } = context
  return (
    <SettingsSection
      id="language"
      title={t('codingOpus.language.navTitle', 'Language')}
      description={t(
        'codingOpus.language.sectionDescription',
        'Pick the language of the whole app.'
      )}
      searchEntries={navigation.getSectionSearchEntries('language')}
    >
      {view.isSectionMounted('language') ? (
        <LanguagePane settings={model.settings} updateSettings={model.updateSettings} />
      ) : null}
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
