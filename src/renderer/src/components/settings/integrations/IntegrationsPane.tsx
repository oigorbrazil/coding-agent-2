import { GitHubIntegrationCard } from '../../integrations/source-control/cli-source-control-integration-cards'
import { IntegrationCardPresentationProvider } from '../../integrations/presentation/integration-card-presentation'
import { useIntegrationProviderStatusRefresh } from '../../../hooks/use-integration-provider-status-refresh'
import { SettingsGroup } from '../section-layout/SettingsGroup'
import { useTranslate } from '@/i18n/use-translate'

// Coding Agent 2 integrates with GitHub only; the inherited GitLab, Bitbucket, Azure DevOps, Gitea, Linear and Jira cards are not offered.
export function IntegrationsPane(): React.JSX.Element {
  const t = useTranslate()
  useIntegrationProviderStatusRefresh()

  return (
    <IntegrationCardPresentationProvider value="settings">
      <SettingsGroup
        title={t('auto.components.settings.IntegrationsPane.298c65ecac', 'Review providers')}
        description={t(
          'auto.components.settings.IntegrationsPane.1683acbac4',
          'Connect the source hosts Coding Agent 2 can use for pull requests, merge requests, checks, and review status.'
        )}
      >
        <div data-settings-row="" className="[&_.border-t]:border-t-0 [&>*]:-mx-4">
          <GitHubIntegrationCard />
        </div>
      </SettingsGroup>
    </IntegrationCardPresentationProvider>
  )
}
