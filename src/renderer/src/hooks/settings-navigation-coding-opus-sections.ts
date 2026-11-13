import { BookOpenCheck, Brain, CircleUser, Languages, Puzzle } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import type { Translate } from '@/i18n/use-translate'
import type { SettingsNavSection } from '@/lib/settings-navigation-types'
import { translateSearchKeyword } from '@/components/settings/search/settings-search-keywords'

export function buildCodingOpusSettingsSections(t: Translate = translate): SettingsNavSection[] {
  return [
    {
      id: 'account',
      title: t('codingOpus.account.navTitle', 'Account'),
      description: t(
        'codingOpus.account.navDescription',
        'Your profile, linked email and sign-in.'
      ),
      icon: CircleUser,
      searchEntries: [
        {
          title: t('codingOpus.account.navTitle', 'Account'),
          keywords: [
            ...translateSearchKeyword('codingOpus.search.profile', 'profile'),
            ...translateSearchKeyword('codingOpus.search.email', 'email'),
            ...translateSearchKeyword('codingOpus.search.login', 'sign in'),
            ...translateSearchKeyword('codingOpus.search.photo', 'photo')
          ]
        }
      ],
      group: 'coding-opus'
    },
    {
      id: 'language',
      title: t('codingOpus.language.navTitle', 'Language'),
      description: t('codingOpus.language.navDescription', 'The language of the whole app.'),
      icon: Languages,
      searchEntries: [
        {
          title: t('codingOpus.language.navTitle', 'Language'),
          keywords: [
            ...translateSearchKeyword('codingOpus.search.locale', 'locale'),
            ...translateSearchKeyword('codingOpus.search.portuguese', 'Portuguese')
          ]
        }
      ],
      group: 'coding-opus'
    },
    {
      id: 'skills',
      title: t('codingOpus.skills.navTitle', 'Skills'),
      description: t(
        'codingOpus.skills.navDescription',
        'Install skills for Claude Code and Codex, globally or into one project.'
      ),
      icon: Puzzle,
      searchEntries: [
        {
          title: t('codingOpus.skills.navTitle', 'Skills'),
          keywords: [
            ...translateSearchKeyword('codingOpus.search.install', 'install'),
            ...translateSearchKeyword('codingOpus.search.project', 'project'),
            ...translateSearchKeyword('codingOpus.search.claude', 'Claude', { englishOnly: true }),
            ...translateSearchKeyword('codingOpus.search.codex', 'Codex', { englishOnly: true })
          ]
        }
      ],
      group: 'coding-opus'
    },
    {
      id: 'coding-opus-playbooks',
      title: t('codingOpus.playbooks.navTitle', 'Playbooks'),
      description: t(
        'codingOpus.playbooks.navDescription',
        'Coding Opus strategy playbooks and the skill installed in Claude Code and Codex.'
      ),
      icon: BookOpenCheck,
      searchEntries: [
        {
          title: t('codingOpus.playbooks.navTitle', 'Playbooks'),
          keywords: [
            ...translateSearchKeyword('codingOpus.search.codingOpus', 'Coding Opus', {
              englishOnly: true
            }),
            ...translateSearchKeyword('codingOpus.search.orchestration', 'orchestration'),
            ...translateSearchKeyword('codingOpus.search.tiers', 'tiers'),
            ...translateSearchKeyword('codingOpus.search.profiles', 'profiles'),
            ...translateSearchKeyword('codingOpus.search.yaml', 'YAML', { englishOnly: true })
          ]
        }
      ],
      group: 'coding-opus'
    },
    {
      id: 'second-brain',
      title: t('codingOpus.brain.navTitle', 'Second brain'),
      description: t(
        'codingOpus.brain.navDescription',
        'Notes the Coding Opus skill reads before it answers or plans.'
      ),
      icon: Brain,
      searchEntries: [
        {
          title: t('codingOpus.brain.navTitle', 'Second brain'),
          keywords: [
            ...translateSearchKeyword('codingOpus.search.notes', 'notes'),
            ...translateSearchKeyword('codingOpus.search.memory', 'memory'),
            ...translateSearchKeyword('codingOpus.search.obsidian', 'Obsidian', {
              englishOnly: true
            })
          ]
        }
      ],
      group: 'coding-opus'
    }
  ]
}
