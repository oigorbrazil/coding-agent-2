import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  CodingOpusSkillTarget,
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

const TARGET_LABELS: Record<CodingOpusSkillTarget, string> = {
  claude: 'Claude Code',
  codex: 'Codex'
}
const GLOBAL_SCOPE_VALUE = '__global__'

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

export function SkillsPane(): React.JSX.Element {
  const t = useTranslate()
  const api = window.api.codingOpus
  const repos = useAppStore((state) => state.repos)
  const projects = useMemo(
    () =>
      repos
        .filter((repo) => getRepoExecutionHostId(repo) === LOCAL_EXECUTION_HOST_ID)
        .map((repo) => ({ id: repo.id, name: repo.displayName, path: repo.path })),
    [repos]
  )
  const [scopeValue, setScopeValue] = useState(GLOBAL_SCOPE_VALUE)
  const [status, setStatus] = useState<SkillCatalogStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scope = useMemo<SkillCatalogScope>(() => {
    const project = projects.find((entry) => entry.id === scopeValue)
    return project ? { kind: 'project', projectPath: project.path } : { kind: 'global' }
  }, [projects, scopeValue])

  const run = useCallback(async (action: () => Promise<SkillCatalogStatus>) => {
    setBusy(true)
    setError(null)
    try {
      setStatus(await action())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (api) {
      void run(() => api.skillCatalog(scope))
    }
  }, [api, run, scope])

  if (!api) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('codingOpus.desktopOnly', 'Available in the desktop app only.')}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-foreground">
          {t('codingOpus.skills.scope', 'Install into')}
        </span>
        <select
          className="h-8 min-w-56 rounded-md border border-input bg-transparent px-2 text-sm text-foreground dark:bg-input/30"
          value={scopeValue}
          onChange={(event) => setScopeValue(event.target.value)}
        >
          <option value={GLOBAL_SCOPE_VALUE}>
            {t('codingOpus.skills.global', 'All projects (global)')}
          </option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {scope.kind === 'project'
            ? scope.projectPath
            : t('codingOpus.skills.globalHint', '~/.claude/skills and ~/.agents/skills')}
        </span>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="divide-y divide-border rounded-md border border-border">
        {(status?.entries ?? []).map((entry) => {
          const installs = (status?.installs ?? []).filter((install) => install.name === entry.name)
          const missing = installs.filter((install) => install.state === 'missing')
          return (
            <div key={entry.name} className="flex flex-col gap-2 px-3 py-3">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-foreground">{entry.title}</span>
                <span className="font-mono text-xs text-muted-foreground">/{entry.name}</span>
                {entry.version ? <Badge variant="outline">v{entry.version}</Badge> : null}
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
              {entry.description ? (
                <p className="line-clamp-3 text-xs text-muted-foreground">{entry.description}</p>
              ) : null}
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
