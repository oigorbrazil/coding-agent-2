import { SearchableSetting } from '../section-layout/SearchableSetting'
import { SettingsGroup } from '../section-layout/SettingsGroup'
import { MobilePane } from './MobilePane'
import { getMobileOverviewSearchEntry } from './mobile-settings-search'
import { useTranslate } from '@/i18n/use-translate'
import { MobileRelayBetaNotice } from './pairing/MobileRelayBetaNotice'
import { openAppHttpLink } from '@/lib/browser/navigation/app-http-link-open'

const ORCA_IOS_APP_STORE_URL = 'https://apps.apple.com/app/orca-ide/id6766130217'
const ORCA_ANDROID_APK_URL = 'https://www.onorca.dev/download/android'

export function MobileSettingsPane(): React.JSX.Element {
  const t = useTranslate()

  return (
    <div className="space-y-8">
      <SettingsGroup>
        <SearchableSetting
          title={t('auto.components.settings.MobileSettingsPane.e7a3ae8c4e', 'Mobile')}
          description={t(
            'auto.components.settings.MobileSettingsPane.174f4a3c6d',
            'Control terminals and agents from your phone.'
          )}
          keywords={getMobileOverviewSearchEntry().keywords}
          className="py-3"
        >
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              {t(
                'auto.components.settings.MobileSettingsPane.installIntro',
                'Install Coding Agent 2 Mobile from the'
              )}{' '}
              <button
                type="button"
                onClick={(event) => openAppHttpLink(ORCA_IOS_APP_STORE_URL, { event })}
                className="cursor-pointer underline underline-offset-2 hover:text-foreground"
              >
                {t('auto.components.settings.MobileSettingsPane.b5a2ed83ff', 'App Store')}
              </button>
              {' · '}
              <button
                type="button"
                // Link the pinned release APK until Android distribution moves to Google Play.
                onClick={(event) => openAppHttpLink(ORCA_ANDROID_APK_URL, { event })}
                className="cursor-pointer underline underline-offset-2 hover:text-foreground"
              >
                {t('auto.components.settings.MobileSettingsPane.androidApkLabel', 'Android APK')}
              </button>
              {t('auto.components.settings.MobileSettingsPane.installOutro', ', then pair below.')}
            </p>
            <MobileRelayBetaNotice />
          </div>
        </SearchableSetting>
      </SettingsGroup>

      <SettingsGroup>
        <MobilePane />
      </SettingsGroup>
    </div>
  )
}
