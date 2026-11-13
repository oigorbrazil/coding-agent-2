import { readAppEnv } from '../../shared/app-env'
import module from 'node:module'
import { join } from 'node:path'

export const ORCAD_COMPILE_CACHE_DIRNAME = '.orcad-compile-cache'

type CompileCacheModule = {
  enableCompileCache?: (directory: string) => unknown
  getCompileCacheDir?: () => string | undefined
}

/** Cache only in managed slots: packaged-app writes break signatures. Fail back to compilation. */
export function enableManagedOrcadCompileCache(
  slotDirectory: string,
  env: NodeJS.ProcessEnv = process.env,
  api: CompileCacheModule = module
): void {
  if (
    !readAppEnv(env, 'ORCAD_MANAGED_ACTIVATION_ROOT') ||
    typeof api.enableCompileCache !== 'function'
  ) {
    return
  }
  try {
    api.enableCompileCache(join(slotDirectory, ORCAD_COMPILE_CACHE_DIRNAME))
  } catch {
    // Unwritable slots or older runtimes compile without a cache.
  }
}

/** Disposable children only: user-process descendants must not inherit slot cache paths. */
export function orcadCompileCacheEnv(
  slotDirectory: string,
  api: CompileCacheModule = module,
  env: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  // Preserve operator-specified caches on unmanaged hosts.
  const enabled =
    Boolean(readAppEnv(env, 'ORCAD_MANAGED_ACTIVATION_ROOT')) &&
    typeof api.getCompileCacheDir === 'function' &&
    Boolean(api.getCompileCacheDir())
  return enabled ? { NODE_COMPILE_CACHE: join(slotDirectory, ORCAD_COMPILE_CACHE_DIRNAME) } : {}
}
