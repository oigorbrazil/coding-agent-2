import { ChevronDown, ServerCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useIntegrationCardPresentation } from '../integrations/presentation/integration-card-presentation'
import { useAppStore } from '@/store/index'
import type { ProviderHostScope } from './provider-account-scope'
import { useTranslate } from '@/i18n/use-translate'

type ProviderHostScopeControlProps = {
  labelPrefix: string
  scope: ProviderHostScope
  className?: string
}

export function ProviderHostScopeControl({
  labelPrefix,
  scope,
  className
}: ProviderHostScopeControlProps): React.JSX.Element {
  const t = useTranslate()
  const compact = useIntegrationCardPresentation() === 'settings'
  const openSettingsPage = useAppStore((state) => state.openSettingsPage)
  const openSettingsTarget = useAppStore((state) => state.openSettingsTarget)

  const openHostsSettings = (): void => {
    openSettingsPage()
    openSettingsTarget({ pane: 'servers', repoId: null, sectionId: 'default-runtime' })
  }

  const scopeLabel = t(
    'auto.components.settings.ProviderHostScopeControl.scope_label',
    '{{value0}}: {{value1}}',
    { value0: labelPrefix, value1: scope.label }
  )
  const openHostsButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="shrink-0"
      onClick={openHostsSettings}
    >
      <ServerCog className="size-3.5" />
      {t('auto.components.settings.ProviderHostScopeControl.change_host', 'Open Remote Servers')}
    </Button>
  )

  if (compact) {
    return (
      <Collapsible className={className}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="group max-w-full">
            <span className="truncate">{scopeLabel}</span>
            <ChevronDown className="size-3.5 shrink-0 group-data-[state=open]:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          <p className="text-muted-foreground">{scope.description}</p>
          {openHostsButton}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Wrap actions before narrow integration cards collapse the scope copy. */}
        <div className="min-w-[min(14rem,100%)] flex-1">
          <span className="font-medium text-foreground">{scopeLabel}</span>
          <div className="mt-0.5 text-muted-foreground">{scope.description}</div>
        </div>
        {openHostsButton}
      </div>
    </div>
  )
}
