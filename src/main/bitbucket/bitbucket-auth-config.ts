import { readProviderEnvironment } from '../source-control/provider-environment'
import { Buffer } from 'node:buffer'

export const DEFAULT_API_BASE_URL = 'https://api.bitbucket.org/2.0'

export type BitbucketAuthConfig = {
  baseUrl: string
  accessToken: string | null
  email: string | null
  apiToken: string | null
}

export function getEnvAuthConfig(): BitbucketAuthConfig {
  return {
    baseUrl: readProviderEnvironment('CODING_BITBUCKET_API_BASE_URL') ?? DEFAULT_API_BASE_URL,
    accessToken: readProviderEnvironment('CODING_BITBUCKET_ACCESS_TOKEN'),
    email: readProviderEnvironment('CODING_BITBUCKET_EMAIL'),
    apiToken: readProviderEnvironment('CODING_BITBUCKET_API_TOKEN')
  }
}

export function hasAuth(config: BitbucketAuthConfig): boolean {
  return Boolean(config.accessToken || (config.email && config.apiToken))
}

export function authHeaders(config: BitbucketAuthConfig): Record<string, string> {
  if (config.accessToken) {
    return { Authorization: `Bearer ${config.accessToken}` }
  }
  if (config.email && config.apiToken) {
    const encoded = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')
    return { Authorization: `Basic ${encoded}` }
  }
  return {}
}
