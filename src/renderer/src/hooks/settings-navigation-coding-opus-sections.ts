import { BookOpenCheck, Brain, LayoutGrid, Puzzle } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import type { Translate } from '@/i18n/use-translate'
import type { SettingsNavSection } from '@/lib/settings-navigation-types'

export function buildCodingOpusSettingsSections(t: Translate = translate): SettingsNavSection[] {
  return [
    {
      id: 'features',
      title: t('codingOpus.features.navTitle', 'Features'),
      description: t(
        'codingOpus.features.navDescription',
        'Everything Coding Agent 2 does, with a shortcut to each setting.'
      ),
      icon: LayoutGrid,
      searchEntries: [{ title: 'Features', keywords: ['recursos', 'functions', 'overview'] }],
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
