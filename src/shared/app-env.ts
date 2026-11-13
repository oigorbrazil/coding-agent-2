import { APP_CHILD_ENV_NAMES } from './app-child-env-names'

export function readAppEnv(
  env: Readonly<Record<string, string | undefined>> | undefined,
  name: string,
  previousPrefix?: string
): string | undefined {
  return (
    env?.[`CODING_AGENT_${name}`] ??
    (previousPrefix ? env?.[`${previousPrefix}${name}`]?.trim() || undefined : undefined) ??
    env?.[`ORCA_${name}`]
  )
}

export function appEnvPairs(name: string, value: string): Record<string, string>
export function appEnvPairs(
  name: string,
  value: string | undefined
): Record<string, string | undefined>
export function appEnvPairs(
  name: string,
  value: string | undefined
): Record<string, string | undefined> {
  return { [`CODING_AGENT_${name}`]: value, [`ORCA_${name}`]: value }
}

export function setAppEnv(
  env: Record<string, string | undefined>,
  name: string,
  value: string | undefined
): void {
  if (value === undefined) {
    deleteAppEnv(env, name)
    return
  }
  Object.assign(env, appEnvPairs(name, value))
}

export function deleteAppEnv(env: Record<string, string | undefined>, name: string): void {
  delete env[`CODING_AGENT_${name}`]
  delete env[`ORCA_${name}`]
}

function appEnvName(key: string): string | undefined {
  if (key.startsWith('CODING_AGENT_')) {
    const name = key.slice('CODING_AGENT_'.length)
    return APP_CHILD_ENV_NAMES.has(name) || name.startsWith('OPENCODE_TASK_ENV_') ? name : undefined
  }
  if (key.startsWith('ORCA_')) {
    const name = key.slice('ORCA_'.length)
    return APP_CHILD_ENV_NAMES.has(name) || name.startsWith('OPENCODE_TASK_ENV_') ? name : undefined
  }
  return undefined
}

export function appEnvKeys(keys: readonly string[]): string[] {
  return [
    ...new Set(
      keys.flatMap((key) => {
        const name = appEnvName(key)
        return name === undefined ? [key] : [`CODING_AGENT_${name}`, `ORCA_${name}`]
      })
    )
  ]
}

export function readAppEnvKey(
  env: Readonly<Record<string, string | undefined>>,
  key: string
): string | undefined {
  const name = appEnvName(key)
  return name === undefined ? env[key] : readAppEnv(env, name)
}

export function setAppEnvKey(
  env: Record<string, string | undefined>,
  key: string,
  value: string | undefined
): void {
  const name = appEnvName(key)
  if (name !== undefined) {
    setAppEnv(env, name, value)
  } else if (value === undefined) {
    delete env[key]
  } else {
    env[key] = value
  }
}

export function deleteAppEnvKey(env: Record<string, string | undefined>, key: string): void {
  for (const alias of appEnvKeys([key])) {
    delete env[alias]
  }
}

export function appEnvAliases(
  env: Readonly<Record<string, string | undefined>>
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const key of Object.keys(env)) {
    setAppEnvKey(result, key, readAppEnvKey(env, key))
  }
  return result
}
