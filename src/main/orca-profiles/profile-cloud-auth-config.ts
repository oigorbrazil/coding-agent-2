import { readAppEnv } from '../../shared/app-env'
import { app } from 'electron'
import {
  cleanCloudServiceUrl as cleanUrl,
  cleanCloudServiceOrigin as cleanOrigin
} from '../../shared/cloud-service-url'
import { resolvePushGatewayOrigin } from '../runtime/push/push-gateway-origin'

export type OrcaCloudAuthConfig = {
  apiBaseUrl: string
  authorizeEndpoint: string
  sessionEndpoint: string
  refreshEndpoint: string
  capabilitiesEndpoint: string
  profileEndpoint: string
  orgEndpoint: string
  logoutEndpoint: string
  relayTokenEndpoint: string
  connectorTokenEndpoint: string
  relayDirectorUrl: string
  clientId: string
  scope: string
}

const DEFAULT_SCOPE = 'openid profile email offline_access'
const PRODUCTION_API_BASE_URL = 'https://login.onorca.dev'
const PRODUCTION_CLIENT_ID = 'orca-desktop'
const PRODUCTION_RELAY_DIRECTOR_URL = 'https://relay.onorca.dev'

// Packaged main omits NODE_ENV; use packaged status to gate development auth overrides.
function isPackagedOrcaBuild(): boolean {
  try {
    return app?.isPackaged === true
  } catch {
    return false
  }
}

function endpoint(baseUrl: string, path: string): string {
  return new URL(path, `${baseUrl}/`).toString()
}

export function getOrcaCloudAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
  packaged: boolean = isPackagedOrcaBuild()
): { configured: true; config: OrcaCloudAuthConfig } | { configured: false; setupMessage: string } {
  // Orca's cloud (onorca.dev) belongs to Orca's makers; Coding Agent 2 signs in through its own
  // account service (Settings → Account), so the inherited sign-in never opens their login page.
  if (env.CODING_AGENT_2_ORCA_CLOUD !== '1') {
    return {
      configured: false,
      setupMessage: 'Orca cloud sign-in is not part of Coding Agent 2. Use Settings → Account.'
    }
  }
  // Plain HTTP token endpoints are development-only.
  const allowLoopbackHttp = !packaged
  const cleanEndpointUrl = (value: string | undefined): string | null =>
    cleanUrl(value, allowLoopbackHttp)
  const configuredApiBaseUrl = readAppEnv(env, 'CLOUD_API_URL')?.trim()
  // Packaged builds need defaults; first-party endpoints and public client IDs are not secrets.
  const apiBaseUrl = configuredApiBaseUrl
    ? cleanEndpointUrl(configuredApiBaseUrl)
    : packaged
      ? PRODUCTION_API_BASE_URL
      : null
  const clientId =
    readAppEnv(env, 'CLOUD_CLIENT_ID')?.trim() || (packaged ? PRODUCTION_CLIENT_ID : undefined)
  if (!apiBaseUrl || !clientId) {
    return {
      configured: false,
      setupMessage: 'Coding Agent 2 Cloud sign-in is not configured for this build.'
    }
  }

  const authBaseUrl = cleanEndpointUrl(readAppEnv(env, 'CLOUD_AUTH_URL')) ?? apiBaseUrl
  return {
    configured: true,
    config: {
      apiBaseUrl,
      authorizeEndpoint:
        cleanEndpointUrl(readAppEnv(env, 'CLOUD_AUTHORIZE_URL')) ??
        endpoint(authBaseUrl, '/v1/desktop/auth/authorize'),
      sessionEndpoint:
        cleanEndpointUrl(readAppEnv(env, 'CLOUD_SESSION_URL')) ??
        endpoint(apiBaseUrl, '/v1/desktop/auth/session'),
      refreshEndpoint:
        cleanEndpointUrl(readAppEnv(env, 'CLOUD_REFRESH_URL')) ??
        endpoint(apiBaseUrl, '/v1/desktop/auth/refresh'),
      capabilitiesEndpoint:
        cleanEndpointUrl(readAppEnv(env, 'CLOUD_CAPABILITIES_URL')) ??
        endpoint(apiBaseUrl, '/v1/desktop/auth/capabilities'),
      profileEndpoint:
        cleanEndpointUrl(readAppEnv(env, 'CLOUD_PROFILE_URL')) ??
        endpoint(apiBaseUrl, '/v1/desktop/auth/profile'),
      orgEndpoint:
        cleanEndpointUrl(readAppEnv(env, 'CLOUD_ORG_URL')) ??
        endpoint(apiBaseUrl, '/v1/desktop/auth/org'),
      logoutEndpoint:
        cleanEndpointUrl(readAppEnv(env, 'CLOUD_LOGOUT_URL')) ??
        endpoint(apiBaseUrl, '/v1/desktop/auth/logout'),
      relayTokenEndpoint:
        cleanEndpointUrl(readAppEnv(env, 'CLOUD_RELAY_TOKEN_URL')) ??
        endpoint(apiBaseUrl, '/v1/desktop/auth/relay-token'),
      connectorTokenEndpoint:
        cleanEndpointUrl(readAppEnv(env, 'CLOUD_CONNECTOR_TOKEN_URL')) ??
        endpoint(apiBaseUrl, '/v1/desktop/auth/connector-token'),
      relayDirectorUrl:
        cleanOrigin(readAppEnv(env, 'RELAY_URL'), allowLoopbackHttp) ??
        PRODUCTION_RELAY_DIRECTOR_URL,
      clientId,
      scope: readAppEnv(env, 'CLOUD_AUTH_SCOPE')?.trim() || DEFAULT_SCOPE
    }
  }
}

/** Host-key authentication keeps phone push available without a signed-in account. */
export function getOrcaPushGatewayUrl(
  env: NodeJS.ProcessEnv = process.env,
  packaged: boolean = isPackagedOrcaBuild()
): string {
  return resolvePushGatewayOrigin(env, packaged)
}

export function allowsPlaintextOrcaCloudSession(
  env: NodeJS.ProcessEnv = process.env,
  packaged: boolean = isPackagedOrcaBuild()
): boolean {
  return (
    readAppEnv(env, 'CLOUD_ALLOW_PLAINTEXT_SESSION') === '1' &&
    env.NODE_ENV !== 'production' &&
    !packaged
  )
}

export function isOrcaCloudDevAuthEnabled(
  env: NodeJS.ProcessEnv = process.env,
  packaged: boolean = isPackagedOrcaBuild()
): boolean {
  return readAppEnv(env, 'CLOUD_DEV_AUTH') === '1' && env.NODE_ENV !== 'production' && !packaged
}
