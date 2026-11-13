import { readAppEnv } from '../../shared/app-env'
import { cleanCloudServiceOrigin } from '../../shared/cloud-service-url'

export function resolveConnectorOrigin(env: NodeJS.ProcessEnv, packaged: boolean): string {
  return (
    cleanCloudServiceOrigin(readAppEnv(env, 'CONNECTOR_URL'), !packaged) ??
    'https://connector.onorca.dev'
  )
}
