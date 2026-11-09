import { useCallback, useEffect, useState } from 'react'
import { FolderOpen, RotateCcw, Save } from 'lucide-react'
import type {
  CodingOpusPlaybooks,
  CodingOpusSkillStatus,
  CodingOpusSkillTarget
} from '../../../../../shared/coding-opus'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Textarea } from '../../ui/textarea'
import { useTranslate } from '@/i18n/use-translate'

const TARGET_LABELS: Record<CodingOpusSkillTarget, string> = {
  claude: 'Claude Code',
  codex: 'Codex'
}

function CodingOpusSkillStatusRows({
  status,
  busy,
  onInstall
}: {
  status: CodingOpusSkillStatus
  busy: boolean
  onInstall: (target: CodingOpusSkillTarget) => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {status.targets.map((entry) => {
        const current = entry.installedVersion === status.bundledVersion
        return (
          <div key={entry.target} className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">
                {TARGET_LABELS[entry.target]}
              </div>
              <div className="truncate font-mono text-xs text-muted-foreground" title={entry.path}>
                {entry.path}
              </div>
            </div>
            <Badge variant={current ? 'secondary' : 'outline'}>
              {entry.installedVersion
                ? t('codingOpus.skill.version', 'v{{value0}}', { value0: entry.installedVersion })
                : t('codingOpus.skill.missing', 'Not installed')}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onInstall(entry.target)}
            >
              {current
                ? t('codingOpus.skill.reinstall', 'Reinstall')
                : entry.installedVersion
                  ? t('codingOpus.skill.update', 'Update to v{{value0}}', {
                      value0: status.bundledVersion
                    })
                  : t('codingOpus.skill.install', 'Install')}
            </Button>
          </div>
        )
      })}
    </div>
  )
}

export function CodingOpusPlaybooksPane(): React.JSX.Element {
  const t = useTranslate()
  const api = window.api.codingOpus
  const [playbooks, setPlaybooks] = useState<CodingOpusPlaybooks | null>(null)
  const [draft, setDraft] = useState('')
  const [skill, setSkill] = useState<CodingOpusSkillStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)

  const load = useCallback(async () => {
    if (!api) {
      return
    }
    const [nextPlaybooks, nextSkill] = await Promise.all([api.readPlaybooks(), api.skillStatus()])
    setPlaybooks(nextPlaybooks)
    setDraft(nextPlaybooks.text)
    setSkill(nextSkill)
  }, [api])

  useEffect(() => {
    void load().catch((error: unknown) =>
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    )
  }, [load])

  if (!api) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('codingOpus.desktopOnly', 'Available in the desktop app only.')}
      </p>
    )
  }

  const dirty = playbooks !== null && draft !== playbooks.text

  const save = async (): Promise<void> => {
    setBusy(true)
    setMessage(null)
    try {
      const result = await api.savePlaybooks(draft)
      if (result.ok) {
        setPlaybooks(result.playbooks)
        setDraft(result.playbooks.text)
        setMessage({ kind: 'info', text: t('codingOpus.playbooks.saved', 'Playbooks saved.') })
      } else {
        setMessage({
          kind: 'error',
          text: t('codingOpus.playbooks.invalid', 'Not saved: {{value0}}', { value0: result.error })
        })
      }
    } finally {
      setBusy(false)
    }
  }

  const install = async (target: CodingOpusSkillTarget): Promise<void> => {
    setBusy(true)
    setMessage(null)
    try {
      setSkill(await api.installSkill([target]))
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            {t('codingOpus.skill.title', 'Coding Opus skill')}
          </h3>
          {skill ? (
            <span className="font-mono text-xs text-muted-foreground">
              {t('codingOpus.skill.bundled', 'Bundled v{{value0}} · {{value1}}', {
                value0: skill.bundledVersion,
                value1: skill.bundledCommit
              })}
            </span>
          ) : null}
        </div>
        {skill ? (
          <CodingOpusSkillStatusRows
            status={skill}
            busy={busy}
            onInstall={(target) => void install(target)}
          />
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t('codingOpus.playbooks.title', 'Playbooks')}
          </h3>
          {playbooks ? (
            <Badge variant="outline">
              {playbooks.custom
                ? t('codingOpus.playbooks.custom', 'Your copy')
                : t('codingOpus.playbooks.bundled', 'Skill default')}
            </Badge>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void api.revealPlaybooks()}
            >
              <FolderOpen />
              {t('codingOpus.playbooks.reveal', 'Show file')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy || !dirty}
              onClick={() => playbooks && setDraft(playbooks.text)}
            >
              <RotateCcw />
              {t('codingOpus.playbooks.discard', 'Discard')}
            </Button>
            <Button size="sm" disabled={busy || !dirty} onClick={() => void save()}>
              <Save />
              {t('codingOpus.playbooks.save', 'Save')}
            </Button>
          </div>
        </div>
        {playbooks ? (
          <div className="truncate font-mono text-xs text-muted-foreground" title={playbooks.path}>
            {playbooks.path}
          </div>
        ) : null}
        <Textarea
          variant="code"
          spellCheck={false}
          className="h-[32rem] resize-y text-xs leading-5 md:text-xs"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 's') {
              event.preventDefault()
              if (dirty && !busy) {
                void save()
              }
            }
          }}
        />
        {message ? (
          <p
            className={
              message.kind === 'error'
                ? 'text-xs text-destructive'
                : 'text-xs text-muted-foreground'
            }
          >
            {message.text}
          </p>
        ) : null}
      </section>
    </div>
  )
}
