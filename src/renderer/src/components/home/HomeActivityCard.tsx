import { useEffect, useMemo } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../store'
import { buildUsageOverview, formatUsageTokens } from '../stats/usage-overview-model'
import { getRecentUsageDays } from '../stats/usage-overview-daily-series'
import type { UsageOverviewDailyPoint } from '../stats/usage-overview-types'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/utils'

const DAY_COUNT = 91
const INTENSITY_CLASS: Record<UsageOverviewDailyPoint['intensity'], string> = {
  0: 'bg-muted',
  1: 'bg-status-success/25',
  2: 'bg-status-success/50',
  3: 'bg-status-success/75',
  4: 'bg-status-success'
}

/** Consecutive days with tokens, counting back from today (yesterday when today is still empty). */
function activeStreak(days: UsageOverviewDailyPoint[]): number {
  let index = days.length - 1
  if (index >= 0 && days[index].totalTokens === 0) {
    index -= 1
  }
  let streak = 0
  for (; index >= 0 && days[index].totalTokens > 0; index--) {
    streak += 1
  }
  return streak
}

/** 90 days of Claude, Codex, OpenCode and Muse tokens, read from their local session logs. */
export function HomeActivityCard(): React.JSX.Element {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const claudeScanState = useAppStore((s) => s.claudeUsageScanState)
  const claudeSummary = useAppStore((s) => s.claudeUsageSummary)
  const claudeDaily = useAppStore((s) => s.claudeUsageDaily)
  const codexScanState = useAppStore((s) => s.codexUsageScanState)
  const codexSummary = useAppStore((s) => s.codexUsageSummary)
  const codexDaily = useAppStore((s) => s.codexUsageDaily)
  const openCodeScanState = useAppStore((s) => s.openCodeUsageScanState)
  const openCodeSummary = useAppStore((s) => s.openCodeUsageSummary)
  const openCodeDaily = useAppStore((s) => s.openCodeUsageDaily)
  const museScanState = useAppStore((s) => s.museUsageScanState)
  const museSummary = useAppStore((s) => s.museUsageSummary)
  const museDaily = useAppStore((s) => s.museUsageDaily)
  const fetchClaudeUsage = useAppStore((s) => s.fetchClaudeUsage)
  const fetchCodexUsage = useAppStore((s) => s.fetchCodexUsage)
  const refreshClaudeUsage = useAppStore((s) => s.refreshClaudeUsage)
  const refreshCodexUsage = useAppStore((s) => s.refreshCodexUsage)
  const enableClaudeUsage = useAppStore((s) => s.enableClaudeUsage)
  const enableCodexUsage = useAppStore((s) => s.enableCodexUsage)

  useEffect(() => {
    void fetchClaudeUsage()
    void fetchCodexUsage()
  }, [fetchClaudeUsage, fetchCodexUsage])

  const overview = useMemo(
    () =>
      buildUsageOverview({
        claude: { scanState: claudeScanState, summary: claudeSummary, daily: claudeDaily },
        codex: { scanState: codexScanState, summary: codexSummary, daily: codexDaily },
        opencode: { scanState: openCodeScanState, summary: openCodeSummary, daily: openCodeDaily },
        muse: { scanState: museScanState, summary: museSummary, daily: museDaily }
      }),
    [
      claudeScanState,
      claudeSummary,
      claudeDaily,
      codexScanState,
      codexSummary,
      codexDaily,
      openCodeScanState,
      openCodeSummary,
      openCodeDaily,
      museScanState,
      museSummary,
      museDaily
    ]
  )
  const days = useMemo(() => getRecentUsageDays(overview.daily, DAY_COUNT), [overview.daily])
  const total = days.reduce((sum, day) => sum + day.totalTokens, 0)
  const streak = activeStreak(days)
  const scanEnabled = Boolean(claudeScanState?.enabled || codexScanState?.enabled)
  const scanning = Boolean(claudeScanState?.isScanning || codexScanState?.isScanning)
  // Columns are weeks, rows Monday→Sunday, like a contribution graph.
  const firstWeekday = days.length > 0 ? (new Date(`${days[0].day}T00:00:00`).getDay() + 6) % 7 : 0
  const cells: (UsageOverviewDailyPoint | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...days
  ]

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Activity className="size-4 text-status-success" />
        <span className="text-sm font-medium text-foreground">
          {t('codingOpus.home.activity', 'Activity')}
        </span>
        <span className="rounded border border-border px-1 font-mono text-[10px] text-muted-foreground">
          90d
        </span>
        {scanEnabled ? (
          <button
            type="button"
            aria-label={t('codingOpus.home.refresh', 'Refresh')}
            disabled={scanning}
            onClick={() => {
              void Promise.all([
                claudeScanState?.enabled ? refreshClaudeUsage() : null,
                codexScanState?.enabled ? refreshCodexUsage() : null
              ])
            }}
            className="ml-auto rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-40"
          >
            <RefreshCw className={cn('size-3.5', scanning && 'animate-spin')} />
          </button>
        ) : null}
      </div>
      {scanEnabled ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-foreground">
              {formatUsageTokens(total, intlLocale)}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {t('codingOpus.home.tokens90', 'tokens in the last 90 days')}
            </span>
          </div>
          <div className="grid grid-flow-col grid-rows-7 gap-[3px] overflow-x-auto">
            {cells.map((day, index) =>
              day ? (
                <span
                  key={day.day}
                  title={`${day.day} · ${formatUsageTokens(day.totalTokens, intlLocale)}`}
                  className={cn('size-2.5 rounded-[2px]', INTENSITY_CLASS[day.intensity])}
                />
              ) : (
                <span key={`pad-${index}`} className="size-2.5" />
              )
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2 font-mono text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-status-success" />
              {t('codingOpus.home.streak', '{{value0}}-day streak', { value0: String(streak) })}
            </span>
            <span>
              {t('codingOpus.home.activeDays', '{{value0}} active days', {
                value0: String(days.filter((day) => day.totalTokens > 0).length)
              })}
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <p className="text-xs text-muted-foreground">
            {t(
              'codingOpus.home.activityOff',
              'Read your Claude Code and Codex session logs on this computer to see daily activity.'
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              void enableClaudeUsage()
              void enableCodexUsage()
            }}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent"
          >
            {t('codingOpus.home.activityOn', 'Turn on activity')}
          </button>
        </div>
      )}
    </div>
  )
}
