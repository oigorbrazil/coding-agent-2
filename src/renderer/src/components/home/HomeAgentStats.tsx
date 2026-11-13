import { useEffect, useState } from 'react'
import type { StatsSummary } from '../../../../shared/process-stats-types'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  const hours = Math.floor(minutes / 60)
  if (hours >= 24) {
    return `${Math.floor(hours / 24)}d ${hours % 24}h`
  }
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

function Tile({
  label,
  value,
  hint
}: {
  label: string
  value: string
  hint?: string
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-background px-3 py-2.5">
      <span className="text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="font-mono text-lg font-semibold text-foreground">{value}</span>
      {hint ? <span className="text-[10px] text-muted-foreground">{hint}</span> : null}
    </div>
  )
}

/** Totals the app records for every agent it launched (kept locally, never sent anywhere). */
export function HomeAgentStats(): React.JSX.Element | null {
  const t = useTranslate()
  const intlLocale = useIntlLocale()
  const [summary, setSummary] = useState<StatsSummary | null>(null)

  useEffect(() => {
    let live = true
    window.api.stats
      ?.getSummary()
      .then((value) => {
        if (live) {
          setSummary(value)
        }
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])

  if (!summary) {
    return null
  }
  const since = summary.firstEventAt
    ? new Intl.DateTimeFormat(intlLocale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(summary.firstEventAt)
    : null
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">
          {t('codingOpus.home.agentsTitle', 'Agents and time')}
        </span>
        {since ? (
          <span className="text-[11px] text-muted-foreground">
            {t('codingOpus.home.since', 'since {{value0}}', { value0: since })}
          </span>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Tile
          label={t('codingOpus.home.agentTime', 'Agent time')}
          value={formatDuration(summary.totalAgentTimeMs)}
          hint={t('codingOpus.home.agentTimeHint', 'summed across every agent')}
        />
        <Tile
          label={t('codingOpus.home.agentsStarted', 'Agents started')}
          value={summary.totalAgentsSpawned.toLocaleString(intlLocale)}
        />
        <Tile
          label={t('codingOpus.home.prsCreated', 'Pull requests')}
          value={summary.totalPRsCreated.toLocaleString(intlLocale)}
        />
      </div>
    </div>
  )
}
