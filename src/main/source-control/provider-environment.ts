import { readAppEnv } from '../../shared/app-env'

export function readProviderEnvironment(name: `CODING_${string}`): string | null {
  return readAppEnv(process.env, name.slice('CODING_'.length), 'CODING_')?.trim() || null
}
