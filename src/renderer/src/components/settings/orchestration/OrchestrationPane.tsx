import { SearchableSetting } from '../section-layout/SearchableSetting'
import { matchesSettingsSearch } from '../search/settings-search'
import { useAppStore } from '../../../store/index'
import { getOrchestrationPaneSearchEntries } from './orchestration-search'
import { useTranslate } from '@/i18n/use-translate'
import type { GlobalSettings } from '../../../../../shared/global-settings-types'
import { resolveNestedWorkerMaxDepth } from '../../../../../shared/nested-worker-depth'
import { isPairedWebClientWindow } from '@/lib/desktop-window-chrome'
import { NumberField } from '../form-controls/SettingsFormControls'
import {
  getNestedWorkerDepthDescription,
  getNestedWorkerDepthTitle
} from './nested-worker-depth-copy'
import { OrchestrationWorkerAutoReleaseSetting } from './OrchestrationWorkerAutoReleaseSetting'
import { SettingsGroup } from '../section-layout/SettingsGroup'

type OrchestrationPaneProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
}

// Coding Agent 2 plans with the Coding Opus skill, so Orca's own `orchestration` skill card
// (install, update badge and /orchestration examples) is gone; only the worker runtime settings stay.
export function OrchestrationPane({
  settings,
  updateSettings
}: OrchestrationPaneProps): React.JSX.Element {
  const t = useTranslate()
  const searchQuery = useAppStore((s) => s.settingsSearchQuery)
  const showLocalRuntimeSettings = !isPairedWebClientWindow()
  const searchEntries = getOrchestrationPaneSearchEntries({
    includeLocalRuntimeSettings: showLocalRuntimeSettings
  })
  const showOrchestration = matchesSettingsSearch(searchQuery, searchEntries)

  if (!showOrchestration) {
    return <div />
  }

  return (
    <SearchableSetting
      title={t('auto.components.settings.OrchestrationPane.191ac34567', 'Agent Orchestration')}
      description={t(
        'codingOpus.orchestration.description',
        'How worker agents run. Coding Opus decides what to delegate; the playbooks set the strategy.'
      )}
      keywords={searchEntries[0].keywords}
      forceVisible
      className="space-y-8"
    >
      {showLocalRuntimeSettings ? (
        <SettingsGroup>
          <NumberField
            label={getNestedWorkerDepthTitle(t)}
            description={getNestedWorkerDepthDescription(t)}
            value={resolveNestedWorkerMaxDepth(settings)}
            min={1}
            integer
            onChange={(nestedWorkerMaxDepth) => {
              void updateSettings({ nestedWorkerMaxDepth })
            }}
          />
          <OrchestrationWorkerAutoReleaseSetting
            settings={settings}
            updateSettings={updateSettings}
          />
        </SettingsGroup>
      ) : null}
    </SearchableSetting>
  )
}
