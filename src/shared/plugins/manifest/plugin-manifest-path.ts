import { join } from 'node:path'
import { resolveLegacyRenamedFile } from '../../legacy-renamed-file'
import { PLUGIN_MANIFEST_FILENAME, LEGACY_PLUGIN_MANIFEST_FILENAME } from './plugin-manifest'

export function pluginManifestPath(rootDir: string): string {
  return resolveLegacyRenamedFile(
    join(rootDir, PLUGIN_MANIFEST_FILENAME),
    join(rootDir, LEGACY_PLUGIN_MANIFEST_FILENAME),
    { copy: false }
  )
}
