import { RefreshCw, Timer } from 'lucide-react'
import type {
  ProviderRateLimits,
  RateLimitState,
  RateLimitWindow
} from '../../../../shared/rate-limit-types'
import { isTuiAgent } from '../../../../shared/agent-launch/catalog/tui-agent-config'
import { AgentIcon } from '@/lib/agent-catalog'
import { useResetCountdownClock } from '@/hooks/useResetCountdownClock'
import { useAppStore } from '../../store'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/utils'
import { HomeActivityCard } from './HomeActivityCard'

const PROVIDER_LABELS: Record<ProviderRateLimits['provider'], string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  gemini: 'Gemini',
  'opencode-go': 'OpenCode Go',
  kimi: 'Kimi',
  minimax: 'MiniMax',
  grok: 'Grok',
  antigravity: 'Antigravity',
  cursor: 'Cursor',
  zcode: 'ZCode',
  muse: 'Muse'
}

function liveProviders(state: RateLimitState): ProviderRateLimits[] {
  return Object.values(state).filter(
    (value): value is ProviderRateLimits =>
      value !== null && typeof value === 'object' && 'provider' in value && 'status' in value
  )
}

function percent(window: RateLimitWindow | null | undefined): number | null {
  return window ? Math.max(0, Math.min(100, Math.round(window.usedPercent))) : null
}

/** "4h 16m" or "3d 19h" until the window resets; null when the provider did not say. */
function countdown(resetsAt: number | null | undefined, now: number): string | null {
  if (!resetsAt || resetsAt <= now) {
    return null
  }
  const minutes = Math.round((resetsAt - now) / 60_000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  if (days > 0) {
    return `${days}d ${hours}h`
  }
  return `${hours}h ${minutes % 60}m`
}

// Calm until the window is mostly spent, then the warning and destructive tokens take over.
function meterClass(used: number): string {
  if (used >= 90) {
    return 'bg-destructive'
  }
  if (used >= 70) {
    return 'bg-status-warning'
  }
  return 'bg-foreground'
}

function Meter({ label, used }: { label: string; used: number }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between font-mono text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">{used}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', meterClass(used))}
          style={{ width: `${used}%` }}
        />
      </div>
    </div>
  )
}

function ProviderCard({ entry }: { entry: ProviderRateLimits }): React.JSX.Element {
  const t = useTranslate()
  const now = useResetCountdownClock([entry.session?.resetsAt, entry.weekly?.resetsAt])
  const session = percent(entry.session)
  const weekly = percent(entry.weekly)
  const fable = percent(entry.fableWeekly)
  const monthly = percent(entry.monthly)
  const headline = session ?? weekly ?? monthly ?? 0
  const headlineReset = countdown((entry.session ?? entry.weekly ?? entry.monthly)?.resetsAt, now)
  const meters = [
    session !== null ? { key: '5h', label: '5h', used: session } : null,
    weekly !== null
      ? { key: 'week', label: t('codingOpus.home.week', 'Week'), used: weekly }
      : null,
    fable !== null ? { key: 'fable', label: 'Fable', used: fable } : null,
    session === null && weekly === null && monthly !== null
      ? { key: 'month', label: t('codingOpus.home.month', 'Month'), used: monthly }
      : null
  ].filter((meter) => meter !== null)
  const peak = Math.max(0, ...meters.map((meter) => meter.used))
  const sessionReset = countdown(entry.session?.resetsAt, now)
  const weeklyReset = countdown(entry.weekly?.resetsAt, now)

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <AgentIcon agent={isTuiAgent(entry.provider) ? entry.provider : null} size={16} />
        <span className="truncate text-sm font-medium text-foreground">
          {PROVIDER_LABELS[entry.provider]}
        </span>
        {entry.planType ? (
          <span className="rounded border border-border px-1 font-mono text-[10px] text-muted-foreground">
            {entry.planType}
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <span
            className={cn(
              'size-1.5 rounded-full',
              entry.status === 'ok' ? 'bg-status-success' : 'bg-status-warning'
            )}
          />
          {entry.status === 'ok'
            ? t('codingOpus.home.live', 'live')
            : t('codingOpus.home.stale', 'stale')}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="font-mono text-3xl font-semibold leading-none text-foreground">
          {headline}
          <span className="text-sm text-muted-foreground">%</span>
        </span>
        {headlineReset ? (
          <span className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-foreground">
            <Timer className="size-3 text-muted-foreground" />
            {headlineReset}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2.5">
        {meters.map((meter) => (
          <Meter key={meter.key} label={meter.label} used={meter.used} />
        ))}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border pt-2 font-mono text-[11px]">
        <div>
          <div className="text-muted-foreground">{t('codingOpus.home.reset5h', 'reset 5h')}</div>
          <div className="text-foreground">{sessionReset ?? '—'}</div>
        </div>
        <div>
          <div className="text-muted-foreground">
            {t('codingOpus.home.resetWeek', 'reset week')}
          </div>
          <div className="text-foreground">{weeklyReset ?? '—'}</div>
        </div>
        <div className="col-span-2 flex justify-between text-muted-foreground">
          <span>{meters.map((meter) => meter.label).join(' · ')}</span>
          <span>
            {t('codingOpus.home.peak', 'peak')} {peak}%
          </span>
        </div>
      </div>
    </div>
  )
}

/** Live quota per signed-in provider, the same readings the status bar polls, plus activity. */
export function HomeUsageCards(): React.JSX.Element {
  const t = useTranslate()
  const rateLimits = useAppStore((s) => s.rateLimits)
  const refreshRateLimits = useAppStore((s) => s.refreshRateLimits)
  const providers = liveProviders(rateLimits).filter(
    (entry) => entry.session || entry.weekly || entry.monthly
  )
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void refreshRateLimits()}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent"
        >
          <RefreshCw className="size-3" />
          {t('codingOpus.home.refresh', 'Refresh')}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((entry) => (
          <ProviderCard key={entry.provider} entry={entry} />
        ))}
        <HomeActivityCard />
      </div>
    </div>
  )
}
