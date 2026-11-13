import { readAppEnv, appEnvPairs } from '../../shared/app-env'
import { dirname, join, resolve } from 'node:path'

import { getPlatformUserDataPath } from './metadata'

/** Dev builds read ORCA_DEV_USER_DATA_PATH rather than --user-data-dir. */
function launchesDevApp(env: NodeJS.ProcessEnv): boolean {
  return readAppEnv(env, 'APP_EXECUTABLE_NEEDS_APP_ROOT') === '1'
}

/** Resolve absolutely: the launched child runs from the app root, not the caller’s cwd. */
export function resolveLaunchUserDataPath(env: NodeJS.ProcessEnv = process.env): string {
  const configuredEnv = readAppEnv(env, 'USER_DATA_PATH')
  if (configuredEnv) {
    return resolve(configuredEnv)
  }
  if (launchesDevApp(env)) {
    return resolve(
      readAppEnv(env, 'DEV_USER_DATA_PATH') || join(dirname(getPlatformUserDataPath()), 'orca-dev')
    )
  }
  return getPlatformUserDataPath()
}

/** Pin the profile through both packaged and dev entry points. */
export function pinLaunchUserDataPath(
  args: string[],
  env: NodeJS.ProcessEnv,
  userDataPath: string
): { args: string[]; env: NodeJS.ProcessEnv } {
  const pinnedEnv: NodeJS.ProcessEnv = { ...env, ...appEnvPairs('USER_DATA_PATH', userDataPath) }
  if (launchesDevApp(env)) {
    pinnedEnv.ORCA_DEV_USER_DATA_PATH = userDataPath
  }
  return { args: [...args, `--user-data-dir=${userDataPath}`], env: pinnedEnv }
}

/** Serve checks this profile before acquiring its instance lock. */
export function pinServeUserDataPath(
  args: string[],
  env: NodeJS.ProcessEnv,
  userDataPath: string
): { args: string[]; env: NodeJS.ProcessEnv } {
  const pinned = pinLaunchUserDataPath(args, env, userDataPath)
  return {
    args: pinned.args,
    env: { ...pinned.env, ...appEnvPairs('SERVE_USER_DATA_PATH', userDataPath) }
  }
}
