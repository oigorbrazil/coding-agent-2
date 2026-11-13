import { useState } from 'react'
import { ChevronDown, ChevronRight, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/utils'
import {
  useIntegrationCardPresentation,
  useIntegrationCardShellClass
} from './integration-card-presentation'

export type IntegrationCardStatusTone = 'connected' | 'attention' | 'neutral'

const STATUS_TONE_CLASSES: Record<IntegrationCardStatusTone, string> = {
  connected: 'border-status-success-border bg-status-success-background text-status-success',
  attention: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  neutral: 'border-border bg-background text-muted-foreground'
}

export function IntegrationCardShell(props: {
  icon: React.ReactNode
  name: string
  description: React.ReactNode
  statusLabel: string
  statusTone: IntegrationCardStatusTone
  checking?: boolean
  className?: string
  settingsSectionId?: string
  actions?: React.ReactNode
  children?: React.ReactNode
}): React.JSX.Element {
  const t = useTranslate()
  const collapsible = useIntegrationCardPresentation() === 'settings'
  const [expanded, setExpanded] = useState<boolean | null>(null)
  const open = !collapsible || (expanded ?? (!props.checking && props.statusTone === 'connected'))
  const shellClass = useIntegrationCardShellClass(props.className)
  const status = props.checking ? (
    <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" />
  ) : (
    <span
      className={cn(
        'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        STATUS_TONE_CLASSES[props.statusTone]
      )}
    >
      {props.statusLabel}
    </span>
  )

  return (
    <Collapsible
      open={open}
      onOpenChange={setExpanded}
      className={shellClass}
      data-settings-section={props.settingsSectionId}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className="shrink-0 text-muted-foreground">{props.icon}</span>
        <div className="min-w-0 flex-1 basis-[16rem] space-y-0.5">
          <p className="text-sm font-medium">{props.name}</p>
          {open ? <p className="text-xs text-muted-foreground">{props.description}</p> : null}
        </div>
        {/* Wrap actions before narrow Settings layouts squeeze provider copy into unreadable columns. */}
        <div className="flex basis-full shrink-0 flex-wrap items-center justify-start gap-1.5 min-[1100px]:ml-auto min-[1100px]:basis-auto min-[1100px]:justify-end">
          {!collapsible ? props.actions : null}
          {status}
          {collapsible ? (
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t('integrations.configureProvider', 'Configure {{provider}}', {
                  provider: props.name
                })}
              >
                {t('integrations.configure', 'Configure')}
                {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </Button>
            </CollapsibleTrigger>
          ) : null}
        </div>
      </div>
      {collapsible ? (
        <CollapsibleContent>
          {props.actions ? <div className="mt-3 flex flex-wrap gap-2">{props.actions}</div> : null}
          {props.children}
        </CollapsibleContent>
      ) : (
        props.children
      )}
    </Collapsible>
  )
}

export function IntegrationCardDetails(props: {
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className={cn('mt-4 space-y-2 border-t border-border/60 pt-4', props.className)}>
      {props.children}
    </div>
  )
}
