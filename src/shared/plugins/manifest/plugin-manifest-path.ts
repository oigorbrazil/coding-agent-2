import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { PLUGIN_MANIFEST_FILENAME, LEGACY_PLUGIN_MANIFEST_FILENAME } from './plugin-manifest'

// Plugin test hooks bundle this file as ESM, so it stays free of the secure-file (native addon) chain.
export function pluginManifestPath(rootDir: string): string {
  const manifestPath = join(rootDir, PLUGIN_MANIFEST_FILENAME)
  const legacyPath = join(rootDir, LEGACY_PLUGIN_MANIFEST_FILENAME)
  return !existsSync(manifestPath) && existsSync(legacyPath) ? legacyPath : manifestPath
}
