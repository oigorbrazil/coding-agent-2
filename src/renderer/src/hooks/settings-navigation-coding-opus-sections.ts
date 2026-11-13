import { BookOpenCheck, Brain, CircleUser, Languages, Puzzle } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import type { Translate } from '@/i18n/use-translate'
import type { SettingsNavSection } from '@/lib/settings-navigation-types'

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
        { title: 'Account', keywords: ['conta', 'perfil', 'profile', 'email', 'login', 'foto'] }
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
          title: 'Language',
          keywords: ['linguagem', 'idioma', 'português', 'portuguese', 'locale']
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
      searchEntries: [{ title: 'Skills', keywords: ['install', 'project', 'claude', 'codex'] }],
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
          title: 'Playbooks',
          keywords: ['coding opus', 'orchestration', 'tiers', 'profiles', 'yaml']
        },
        { title: 'Coding Opus', keywords: ['skill', 'claude', 'codex', 'install'] }
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
          title: 'Second brain',
          keywords: ['notes', 'memory', 'obsidian', 'brain.py', 'coding opus']
        }
      ],
      group: 'coding-opus'
    }
  ]
}
