import { useMemo, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import type { TuiAgent } from '../../../../shared/agent-launch/catalog/tui-agent'
import type { Repo } from '../../../../shared/repo-types'
import { AGENT_CATALOG, AgentIcon } from '@/lib/agent-catalog'
import { launchWorkItemDirect } from '@/lib/workspace/creation/work-item/launch-work-item-direct'
import { isImeOwnedKeyboardEvent } from '@/lib/ime-composition-keyboard-event'
import { useAppStore } from '../../store'
import { useTranslate } from '@/i18n/use-translate'
import { Textarea } from '../ui/textarea'
import { runWithBusyFlag } from '@/lib/busy-flag-task'

// The agents the home box offers; the composer behind it still lists every installed one.
const HOME_AGENT_IDS = ['claude', 'codex', 'gemini', 'opencode', 'copilot', 'cursor']
const TITLE_MAX = 60

const SELECT_CLASS =
  'h-8 min-w-0 rounded-md border border-border bg-background px-2 font-mono text-xs text-foreground'

export function HomePromptCard({
  repos,
  defaultRepoId
}: {
  repos: readonly Repo[]
  defaultRepoId: string | null
}): React.JSX.Element {
  const t = useTranslate()
  const openModal = useAppStore((s) => s.openModal)
  const agents = useMemo(
    () => AGENT_CATALOG.filter((entry) => HOME_AGENT_IDS.includes(entry.id)),
    []
  )
  const [prompt, setPrompt] = useState('')
  const [agent, setAgent] = useState<TuiAgent>(agents[0]?.id ?? 'claude')
  const [repoId, setRepoId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const selectedRepoId = repoId ?? defaultRepoId ?? repos[0]?.id ?? null

  const send = async (): Promise<void> => {
    const text = prompt.trim()
    if (!text) {
      return
    }
    if (!selectedRepoId) {
      openModal('add-repo')
      return
    }
    const openComposer = (): void =>
      openModal('new-workspace-composer', {
        initialRepoId: selectedRepoId,
        recovery: { note: text, agent },
        telemetrySource: 'unknown'
      })
    await runWithBusyFlag(setSending, async () => {
      // Same path as "fix checks": a new workspace whose agent gets the prompt once it is ready.
      const result = await launchWorkItemDirect({
        item: {
          type: 'issue',
          number: null,
          url: '',
          title: text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX - 1)}…` : text,
          pasteContent: text
        },
        repoId: selectedRepoId,
        agentOverride: agent,
        launchSource: 'new_workspace_composer',
        telemetrySource: 'unknown',
        promptDelivery: 'submit-after-ready',
        openModalFallback: openComposer
      })
      if (result === true) {
        setPrompt('')
      }
    })
  }

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <span className="size-2 rounded-full bg-destructive" />
        <span className="size-2 rounded-full bg-status-warning" />
        <span className="size-2 rounded-full bg-status-success" />
        <span className="ml-2 font-mono text-[11px] text-muted-foreground">
          coding-agent-2@workspace:~
        </span>
      </div>
      <div className="flex items-start gap-2 px-3 pt-3">
        <span className="pt-2 font-mono text-sm text-muted-foreground">❯</span>
        <Textarea
          variant="composite"
          rows={2}
          value={prompt}
          disabled={sending}
          placeholder={t('codingOpus.home.promptPlaceholder', 'What do you want to build?')}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !isImeOwnedKeyboardEvent(event)) {
              event.preventDefault()
              void send()
            }
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 px-3 pb-3 pt-1">
        <label className="flex items-center gap-1.5">
          <AgentIcon agent={agent} size={14} />
          <span className="sr-only">{t('codingOpus.home.agent', 'Agent')}</span>
          <select
            className={SELECT_CLASS}
            value={agent}
            onChange={(event) => {
              const next = agents.find((entry) => entry.id === event.target.value)
              if (next) {
                setAgent(next.id)
              }
            }}
          >
            {agents.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="font-mono text-xs text-muted-foreground">
            {t('codingOpus.home.project', 'Project')}:
          </span>
          <select
            className={`${SELECT_CLASS} flex-1`}
            value={selectedRepoId ?? ''}
            onChange={(event) => setRepoId(event.target.value || null)}
          >
            {repos.length === 0 ? (
              <option value="">{t('codingOpus.home.noProject', 'Add a project first')}</option>
            ) : null}
            {repos.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.displayName}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          aria-label={t('codingOpus.home.send', 'Start agent')}
          disabled={sending || !prompt.trim()}
          onClick={() => void send()}
          className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
    </div>
  )
}
