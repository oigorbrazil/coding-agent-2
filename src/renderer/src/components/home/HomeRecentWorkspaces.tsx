import { useMemo } from 'react'
import { FolderGit2 } from 'lucide-react'
import { useAppStore } from '../../store'
import { activateAndRevealWorktree } from '@/lib/workspace/activation/worktree-activation'
import { formatTimeAgo } from '../right-sidebar/ai-vault/session-list/ai-vault-session-time'
import { useTranslate } from '@/i18n/use-translate'

const RECENT_LIMIT = 6

/** The workspaces touched most recently, across every project. */
export function HomeRecentWorkspaces({
  onAddProject
}: {
  onAddProject: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const worktreesByRepo = useAppStore((s) => s.worktreesByRepo)
  const repos = useAppStore((s) => s.repos)
  const recent = useMemo(() => {
    const repoNames = new Map(repos.map((repo) => [repo.id, repo.displayName]))
    return Object.values(worktreesByRepo)
      .flat()
      .filter((worktree) => repoNames.has(worktree.repoId))
      .toSorted((a, b) => b.lastActivityAt - a.lastActivityAt)
      .slice(0, RECENT_LIMIT)
      .map((worktree) => ({ worktree, repoName: repoNames.get(worktree.repoId) ?? '' }))
  }, [worktreesByRepo, repos])

  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-6 py-10 text-center">
        <FolderGit2 className="size-6 text-muted-foreground" />
        <div className="text-sm font-medium text-foreground">
          {t('codingOpus.home.emptyTitle', 'No workspaces yet')}
        </div>
        <p className="max-w-sm text-xs text-muted-foreground">
          {t(
            'codingOpus.home.emptyDescription',
            'Add a project, then start an agent from the box above.'
          )}
        </p>
        <button
          type="button"
          onClick={onAddProject}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          {t('codingOpus.home.addProject', 'Add project')}
        </button>
      </div>
    )
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {recent.map(({ worktree, repoName }) => (
        <button
          key={worktree.id}
          type="button"
          onClick={() => activateAndRevealWorktree(worktree.id)}
          className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent"
        >
          <span className="truncate text-sm text-foreground">{worktree.displayName}</span>
          <span className="flex items-center gap-2 truncate text-[11px] text-muted-foreground">
            <span className="truncate">{repoName}</span>
            {worktree.lastActivityAt > 0 ? (
              <span className="shrink-0 font-mono">
                {formatTimeAgo(worktree.lastActivityAt, t)}
              </span>
            ) : null}
          </span>
        </button>
      ))}
    </div>
  )
}
