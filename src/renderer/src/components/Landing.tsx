import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpenCheck,
  Brain,
  ExternalLink,
  FolderPlus,
  GitBranchPlus,
  X
} from 'lucide-react'
import { useAppStore } from '../store'
import type { Repo } from '../../../shared/repo-types'
import {
  dismissPreflightIssue,
  githubProjectKeys,
  isPreflightIssueDismissed
} from './landing-preflight-dismissal'
import { useShortcutKeyDetails } from '@/hooks/useShortcutLabel'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import type { PreflightIssue } from './landing-preflight-issues'
import { useLandingPreflightRuntime } from './landing-preflight-runtime'
import { openAppHttpLink } from '@/lib/browser/navigation/app-http-link-open'
import { ShortcutKeyCombo } from './ShortcutKeyCombo'
import { selectWorktreesByRepo } from '@/store/workspaces/catalog/workspace-record-fields'
import defaultAvatar from '../assets/default-avatar.png'
import { HomePromptCard } from './home/HomePromptCard'
import { HomeRecentWorkspaces } from './home/HomeRecentWorkspaces'
import { HomeUsageCards } from './home/HomeUsageCards'
import { HomeAgentStats } from './home/HomeAgentStats'
import { useCodingAgentAccount } from './sidebar/SidebarProfileRow'

function dismissedPreflightIssueIds(issues: PreflightIssue[], repos: readonly Repo[]): Set<string> {
  return new Set(
    issues
      .filter((issue) => issue.dismissible && isPreflightIssueDismissed(issue.id, repos))
      .map((issue) => issue.id)
  )
}

function PreflightBanner({
  issues,
  repos
}: {
  issues: PreflightIssue[]
  repos: readonly Repo[]
}): React.JSX.Element | null {
  const t = useTranslate()
  // Recheck dismissals when the GitHub project set changes so expired nudges can reappear.
  const githubKey = githubProjectKeys(repos).join('|')
  const [dismissed, setDismissed] = useState<Set<string>>(() =>
    dismissedPreflightIssueIds(issues, repos)
  )

  // Reseed only when GitHub projects change; issues identity is stable and would reset transient dismissals each render.
  const reseedDismissed = useEffectEvent(() =>
    setDismissed(dismissedPreflightIssueIds(issues, repos))
  )
  useEffect(() => {
    reseedDismissed()
  }, [githubKey])

  const visibleIssues = issues.filter((issue) => !dismissed.has(issue.id))
  if (visibleIssues.length === 0) {
    return null
  }

  const dismiss = (issue: PreflightIssue): void => {
    dismissPreflightIssue(issue.id, repos)
    setDismissed((prev) => new Set(prev).add(issue.id))
  }

  return (
    // Keep setup nudges narrow and muted; the styleguide reserves warning/error framing for actual problems.
    <div className="w-full max-w-sm space-y-1.5 rounded-lg border border-border bg-muted/40 p-3">
      {visibleIssues.map((issue) => (
        <div
          key={issue.id}
          className="flex items-start gap-3 rounded-md px-1 py-1.5 first:pt-0 last:pb-0"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warning" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[13px] font-medium leading-snug text-foreground">{issue.title}</p>
            <p className="text-xs leading-snug text-muted-foreground">{issue.description}</p>
            <button
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline cursor-pointer"
              onClick={(event) => openAppHttpLink(issue.fixUrl, { event })}
            >
              {issue.fixLabel}
              <ExternalLink className="size-3" />
            </button>
          </div>
          {issue.dismissible && (
            <button
              className="-mr-1 -mt-0.5 shrink-0 rounded p-1 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
              onClick={() => dismiss(issue)}
              aria-label={t('auto.components.Landing.preflightDismiss', 'Dismiss')}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function greetingKey(hour: number): [string, string] {
  if (hour < 12) {
    return ['codingOpus.home.morning', 'Good morning']
  }
  if (hour < 18) {
    return ['codingOpus.home.afternoon', 'Good afternoon']
  }
  return ['codingOpus.home.evening', 'Good evening']
}

function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

function HomeSectionTitle({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h2 className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </h2>
  )
}

export default function Landing(): React.JSX.Element {
  const t = useTranslate()
  const repos = useAppStore((s) => s.repos)
  const worktreesByRepo = useAppStore(selectWorktreesByRepo)
  const openModal = useAppStore((s) => s.openModal)
  const openSettingsTarget = useAppStore((s) => s.openSettingsTarget)
  const openSettingsPage = useAppStore((s) => s.openSettingsPage)
  const { preflightIssues } = useLandingPreflightRuntime()
  const now = useMinuteClock()
  const intlLocale = useIntlLocale()
  const account = useCodingAgentAccount()
  const profileName = account?.name.trim() ?? ''
  const profilePhoto = account?.photo ?? null
  const [greetingId, greetingDefault] = greetingKey(now.getHours())
  const dateLabel = new Intl.DateTimeFormat(intlLocale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(now)

  // The project whose workspace moved last is the likeliest next target.
  const lastRepoId = useMemo(
    () =>
      Object.values(worktreesByRepo)
        .flat()
        .toSorted((a, b) => b.lastActivityAt - a.lastActivityAt)[0]?.repoId ?? null,
    [worktreesByRepo]
  )

  const createShortcut = useShortcutKeyDetails('workspace.create')
  const searchShortcut = useShortcutKeyDetails('worktree.palette')
  const addProject = (): void => openModal('add-repo')
  const newWorkspace = (): void =>
    openModal('new-workspace-composer', { telemetrySource: 'unknown' })
  const openPane = (pane: 'coding-opus-playbooks' | 'second-brain'): void => {
    openSettingsPage()
    openSettingsTarget({ pane, repoId: null })
  }
  const starters = [
    {
      id: 'workspace',
      icon: GitBranchPlus,
      label: t('codingOpus.home.newWorkspace', 'New workspace'),
      onClick: newWorkspace,
      shortcut: createShortcut
    },
    {
      id: 'project',
      icon: FolderPlus,
      label: t('codingOpus.home.addProject', 'Add project'),
      onClick: addProject
    },
    {
      id: 'playbooks',
      icon: BookOpenCheck,
      label: t('codingOpus.home.playbooks', 'Playbooks'),
      onClick: () => openPane('coding-opus-playbooks')
    },
    {
      id: 'brain',
      icon: Brain,
      label: t('codingOpus.home.secondBrain', 'Second brain'),
      onClick: () => openPane('second-brain')
    }
  ]

  return (
    <div className="scrollbar-sleek absolute inset-0 overflow-y-auto bg-background">
      <div className="relative mx-auto flex w-full max-w-[940px] flex-col gap-8 px-6 pt-[12vh] pb-12">
        <section className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-4">
          <img
            src={profilePhoto ?? defaultAvatar}
            alt=""
            className="size-14 rounded-full border border-border object-cover"
          />
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {t(greetingId, greetingDefault)}
              {profileName ? `, ${profileName}` : ''}.
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">{dateLabel}</p>
          </div>
          {preflightIssues.length > 0 && <PreflightBanner issues={preflightIssues} repos={repos} />}
          <HomePromptCard repos={repos} defaultRepoId={lastRepoId} />
        </section>

        <section className="flex flex-col gap-3">
          <HomeSectionTitle>{t('codingOpus.home.recent', 'Recent workspaces')}</HomeSectionTitle>
          <HomeRecentWorkspaces onAddProject={addProject} />
        </section>

        <section className="flex flex-col gap-3">
          <HomeSectionTitle>{t('codingOpus.home.start', 'Start something')}</HomeSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {starters.map((starter) => (
              <button
                key={starter.id}
                type="button"
                onClick={starter.onClick}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
              >
                <starter.icon className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate">{starter.label}</span>
                {starter.shortcut ? (
                  <ShortcutKeyCombo
                    keys={starter.shortcut.keys}
                    doubleTap={starter.shortcut.doubleTap}
                    separatorClassName="mx-0.5 text-[10px] text-muted-foreground"
                  />
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <HomeSectionTitle>{t('codingOpus.home.usage', 'Usage and activity')}</HomeSectionTitle>
          <HomeUsageCards />
          <HomeAgentStats />
        </section>

        <footer className="flex flex-wrap items-center justify-end gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
          {[
            {
              id: 'search',
              shortcut: searchShortcut,
              label: t('codingOpus.home.footerSearch', 'search')
            },
            {
              id: 'create',
              shortcut: createShortcut,
              label: t('codingOpus.home.footerCreate', 'new workspace')
            }
          ].map((item) => (
            <span key={item.id} className="flex items-center gap-1.5">
              <ShortcutKeyCombo
                keys={item.shortcut.keys}
                doubleTap={item.shortcut.doubleTap}
                separatorClassName="mx-0.5 text-[10px] text-muted-foreground"
              />
              {item.label}
            </span>
          ))}
        </footer>
      </div>
    </div>
  )
}
