import { useCallback, useEffect, useMemo, useState } from 'react'
import { FolderPlus } from 'lucide-react'
import type {
  CodingOpusSkillTarget,
  SkillCatalogEntry,
  SkillCatalogInstall,
  SkillCatalogScope,
  SkillCatalogStatus
} from '../../../../../shared/coding-opus'
import {
  getRepoExecutionHostId,
  LOCAL_EXECUTION_HOST_ID
} from '../../../../../shared/execution-host'
import { useAppStore } from '../../../store/index'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { LinearAgentSkillInstallCta } from '../../skills/setup/linear-agent-skill-install-cta'
import { runWithBusyFlag } from '@/lib/busy-flag-task'

const TARGET_LABELS: Record<CodingOpusSkillTarget, string> = {
  claude: 'Claude Code',
  codex: 'Codex'
}
const GLOBAL_SCOPE = '__global__'

type Project = { id: string; name: string; path: string }
type Api = NonNullable<typeof window.api.codingOpus>

function scopeFor(value: string, projects: Project[]): SkillCatalogScope {
  const project = projects.find((entry) => entry.id === value)
  return project ? { kind: 'project', projectPath: project.path } : { kind: 'global' }
}

function InstallCell({
  install,
  busy,
  onInstall,
  onRemove
}: {
  install: SkillCatalogInstall
  busy: boolean
  onInstall: () => void
  onRemove: () => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">
        {TARGET_LABELS[install.target]}
      </span>
      {install.state === 'missing' ? (
        <Button size="xs" variant="outline" disabled={busy} onClick={onInstall}>
          {t('codingOpus.skills.install', 'Install')}
        </Button>
      ) : (
        <>
          <Badge variant={install.state === 'managed' ? 'secondary' : 'outline'}>
            {install.state === 'managed'
              ? t('codingOpus.skills.installed', 'Installed{{value0}}', {
                  value0: install.version ? ` · v${install.version}` : ''
                })
              : t('codingOpus.skills.external', 'Installed by hand')}
          </Badge>
          <Button size="xs" variant="ghost" disabled={busy} onClick={onInstall}>
            {t('codingOpus.skills.reinstall', 'Reinstall')}
          </Button>
          {install.state === 'managed' ? (
            <Button size="xs" variant="ghost" disabled={busy} onClick={onRemove}>
              {t('codingOpus.skills.remove', 'Remove')}
            </Button>
          ) : null}
        </>
      )}
    </div>
  )
}

function SkillRow({
  api,
  entry,
  projects,
  onForget
}: {
  api: Api
  entry: SkillCatalogEntry
  projects: Project[]
  onForget: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const [scopeValue, setScopeValue] = useState(GLOBAL_SCOPE)
  const [status, setStatus] = useState<SkillCatalogStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scope = useMemo(() => scopeFor(scopeValue, projects), [scopeValue, projects])

  const run = useCallback(async (action: () => Promise<SkillCatalogStatus>) => {
    setError(null)
    await runWithBusyFlag(setBusy, async () => {
      try {
        setStatus(await action())
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught))
      }
    })
  }, [])

  useEffect(() => {
    void run(() => api.skillCatalog(scope))
  }, [api, run, scope])

  const installs = (status?.installs ?? []).filter((install) => install.name === entry.name)
  const missing = installs.filter((install) => install.state === 'missing')

  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-medium text-foreground">{entry.title}</span>
        <span className="font-mono text-xs text-muted-foreground">/{entry.name}</span>
        {entry.version ? <Badge variant="outline">v{entry.version}</Badge> : null}
        {entry.origin === 'library' ? (
          <Badge variant="outline">{t('codingOpus.skills.loaded', 'Loaded')}</Badge>
        ) : null}
        {entry.origin === 'library' ? (
          <Button size="xs" variant="ghost" className="ml-auto" disabled={busy} onClick={onForget}>
            {t('codingOpus.skills.forget', 'Remove from list')}
          </Button>
        ) : null}
      </div>
      {entry.description ? (
        <p className="line-clamp-3 text-xs text-muted-foreground">{entry.description}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {t('codingOpus.skills.scope', 'Install into')}
        </span>
        <select
          className="h-7 min-w-52 rounded-md border border-input bg-transparent px-2 text-xs text-foreground dark:bg-input/30"
          value={scopeValue}
          aria-label={t('codingOpus.skills.scopeFor', 'Where {{value0}} is installed', {
            value0: entry.name
          })}
          onChange={(event) => setScopeValue(event.target.value)}
        >
          <option value={GLOBAL_SCOPE}>
            {t('codingOpus.skills.global', 'All projects (global)')}
          </option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
          {scope.kind === 'project'
            ? scope.projectPath
            : t('codingOpus.skills.globalHint', '~/.claude/skills and ~/.agents/skills')}
        </span>
        {missing.length > 1 ? (
          <Button
            size="xs"
            className="ml-auto"
            disabled={busy}
            onClick={() =>
              void run(() =>
                api.installCatalogSkill(
                  entry.name,
                  missing.map((install) => install.target),
                  scope
                )
              )
            }
          >
            {t('codingOpus.skills.installBoth', 'Install for both')}
          </Button>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        {installs.map((install) => (
          <InstallCell
            key={install.target}
            install={install}
            busy={busy}
            onInstall={() =>
              void run(() => api.installCatalogSkill(entry.name, [install.target], scope))
            }
            onRemove={() =>
              void run(() => api.removeCatalogSkill(entry.name, [install.target], scope))
            }
          />
        ))}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

export function SkillsPane(): React.JSX.Element {
  const t = useTranslate()
  const api = window.api.codingOpus
  const repos = useAppStore((state) => state.repos)
  const settings = useAppStore((state) => state.settings)
  const projects = useMemo(
    () =>
      repos
        .filter((repo) => getRepoExecutionHostId(repo) === LOCAL_EXECUTION_HOST_ID)
        .map((repo) => ({ id: repo.id, name: repo.displayName, path: repo.path })),
    [repos]
  )
  const [entries, setEntries] = useState<SkillCatalogEntry[]>([])
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (api) {
      setEntries((await api.skillCatalog({ kind: 'global' })).entries)
    }
  }, [api])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!api) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('codingOpus.desktopOnly', 'Available in the desktop app only.')}
      </p>
    )
  }

  const load = async (): Promise<void> => {
    setMessage(null)
    await runWithBusyFlag(setLoading, async () => {
      const result = await api.loadSkillFolder()
      if (!result.ok) {
        setMessage({ kind: 'error', text: result.error })
      } else if (result.value) {
        setMessage({
          kind: 'info',
          text: t(
            'codingOpus.skills.loadedMessage',
            '{{value0}} loaded. Pick where to install it.',
            {
              value0: result.value
            }
          )
        })
        await refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          {t(
            'codingOpus.skills.loadHint',
            'Each skill chooses its own place: every project, or one. Load more from any folder that has a SKILL.md.'
          )}
        </p>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => void load()}>
          <FolderPlus />
          {t('codingOpus.skills.load', 'Load skill')}
        </Button>
      </div>
      {message ? (
        <p
          className={
            message.kind === 'error' ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'
          }
        >
          {message.text}
        </p>
      ) : null}
      {[
        {
          key: 'native',
          title: t('codingOpus.skills.groupNative', 'Native'),
          empty: '',
          items: entries.filter((entry) => entry.origin !== 'library')
        },
        {
          key: 'added',
          title: t('codingOpus.skills.groupAdded', 'Added'),
          empty: t(
            'codingOpus.skills.addedEmpty',
            'No skills added yet. Use Load skill to add one.'
          ),
          items: entries.filter((entry) => entry.origin === 'library')
        }
      ].map((group) => (
        <section key={group.key} className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
            <Badge variant="outline">{group.items.length}</Badge>
          </div>
          {group.items.length > 0 ? (
            <div className="divide-y divide-border rounded-md border border-border">
              {group.items.map((entry) => (
                <SkillRow
                  key={entry.name}
                  api={api}
                  entry={entry}
                  projects={projects}
                  onForget={() =>
                    void api
                      .forgetLibrarySkill(entry.name)
                      .then(refresh)
                      .catch((error: unknown) =>
                        setMessage({
                          kind: 'error',
                          text: error instanceof Error ? error.message : String(error)
                        })
                      )
                  }
                />
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
              {group.empty}
            </p>
          )}
        </section>
      ))}
      <section data-settings-section="linear-agent-skill" className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-foreground">Linear</h3>
        <LinearAgentSkillInstallCta settings={settings} />
      </section>
    </div>
  )
}
