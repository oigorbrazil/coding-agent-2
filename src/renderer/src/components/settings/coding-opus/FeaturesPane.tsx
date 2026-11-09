import { ArrowRight } from 'lucide-react'
import type { SettingsNavTarget } from '@/lib/settings-navigation-types'
import { useAppStore } from '../../../store/index'
import { Button } from '../../ui/button'
import { useTranslate } from '@/i18n/use-translate'
import type { Translate } from '@/i18n/use-translate'

type Feature = { key: string; title: string; description: string; pane?: SettingsNavTarget }
type FeatureGroup = { key: string; title: string; features: Feature[] }

// Every feature Coding Agent 2 keeps; `pane` jumps to the settings screen that configures it.
const FEATURE_GROUPS: FeatureGroup[] = [
  {
    key: 'codingOpus',
    title: 'Coding Opus',
    features: [
      {
        key: 'skill',
        title: 'Coding Opus skill',
        description:
          'Version 30 bundled and kept installed in Claude Code and Codex; it decides what to delegate, with which playbook, model and effort.',
        pane: 'skills'
      },
      {
        key: 'playbooks',
        title: 'Playbooks',
        description:
          'Edit the strategy playbooks the skill plans with, validated before saving, with a backup of the previous copy.',
        pane: 'coding-opus-playbooks'
      },
      {
        key: 'brain',
        title: 'Second brain',
        description:
          'Browse, search and record notes in the global second brain through brain.py; agents read it before answering or planning.',
        pane: 'second-brain'
      },
      {
        key: 'skills',
        title: 'Skills',
        description: 'Install skills for Claude Code and Codex globally or into a single project.',
        pane: 'skills'
      }
    ]
  },
  {
    key: 'agents',
    title: 'Agents and orchestration',
    features: [
      {
        key: 'agents',
        title: 'Agents',
        description:
          'Run Claude Code, Codex, Gemini, Copilot, Cursor, OpenCode and more side by side, each with live status: working, waiting or asking.',
        pane: 'agents'
      },
      {
        key: 'accounts',
        title: 'Provider accounts',
        description:
          'Several Claude, Codex, Cursor and Grok accounts, switching between them and tracking quota and usage.',
        pane: 'accounts'
      },
      {
        key: 'orchestration',
        title: 'Orchestration',
        description:
          'Dispatch work to worker agents with task graphs, questions back to the lead and decision gates.',
        pane: 'orchestration'
      },
      {
        key: 'automations',
        title: 'Automations',
        description: 'Run agents on a schedule.',
        pane: 'automations'
      },
      {
        key: 'history',
        title: 'Agent session search',
        description: 'Search every agent conversation and resume a past session.',
        pane: 'session-history'
      },
      {
        key: 'chat',
        title: 'Native chat',
        description: 'A structured chat with the agent as an alternative to its terminal.',
        pane: 'chat'
      }
    ]
  },
  {
    key: 'code',
    title: 'Code',
    features: [
      {
        key: 'workspaces',
        title: 'Workspaces',
        description: 'One git worktree per task, plain folders too, grouped by project.',
        pane: 'general'
      },
      {
        key: 'terminal',
        title: 'Terminal',
        description: 'Real terminals with tabs and splits that survive restarts.',
        pane: 'terminal'
      },
      {
        key: 'quickCommands',
        title: 'Quick commands',
        description: 'Saved terminal commands, global or per project.',
        pane: 'quick-commands'
      },
      {
        key: 'git',
        title: 'Git and source control',
        description: 'Diffs, commits with AI messages, branches and pull requests.',
        pane: 'git'
      },
      {
        key: 'github',
        title: 'GitHub',
        description: 'Pull requests, issues and checks from GitHub.',
        pane: 'integrations'
      },
      {
        key: 'editor',
        title: 'Editor',
        description:
          'Read and edit files and review diffs inside the app, or open them in your editor.'
      }
    ]
  },
  {
    key: 'devices',
    title: 'Other devices',
    features: [
      {
        key: 'mobile',
        title: 'Mobile',
        description: 'Pair a phone to follow and steer agents away from the desk.',
        pane: 'mobile'
      },
      {
        key: 'servers',
        title: 'Servers',
        description: 'Serve mode and remote clients paired from a browser.',
        pane: 'servers'
      },
      {
        key: 'ssh',
        title: 'SSH',
        description: 'Run agents on remote machines over SSH.',
        pane: 'ssh'
      }
    ]
  },
  {
    key: 'app',
    title: 'App',
    features: [
      {
        key: 'appearance',
        title: 'Appearance',
        description: 'Themes, fonts and the app icon.',
        pane: 'appearance'
      },
      {
        key: 'notifications',
        title: 'Notifications',
        description: 'Alerts when an agent finishes or asks something.',
        pane: 'notifications'
      },
      {
        key: 'shortcuts',
        title: 'Shortcuts',
        description: 'Rebind every keyboard shortcut.',
        pane: 'shortcuts'
      },
      {
        key: 'privacy',
        title: 'Privacy',
        description: 'What the app stores and sends.',
        pane: 'privacy'
      }
    ]
  }
]

function featureText(
  t: Translate,
  group: string,
  feature: Feature
): { title: string; description: string } {
  return {
    title: t(`codingOpus.features.${group}.${feature.key}.title`, feature.title),
    description: t(`codingOpus.features.${group}.${feature.key}.description`, feature.description)
  }
}

export function FeaturesPane(): React.JSX.Element {
  const t = useTranslate()
  const openSettingsTarget = useAppStore((state) => state.openSettingsTarget)
  return (
    <div className="flex flex-col gap-6">
      {FEATURE_GROUPS.map((group) => (
        <section key={group.key} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t(`codingOpus.features.${group.key}.group`, group.title)}
          </h3>
          <div className="divide-y divide-border rounded-md border border-border">
            {group.features.map((feature) => {
              const text = featureText(t, group.key, feature)
              const pane = feature.pane
              return (
                <div key={feature.key} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground">{text.title}</div>
                    <div className="text-xs text-muted-foreground">{text.description}</div>
                  </div>
                  {pane ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => openSettingsTarget({ pane, repoId: null })}
                    >
                      {t('codingOpus.features.open', 'Open')}
                      <ArrowRight />
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
