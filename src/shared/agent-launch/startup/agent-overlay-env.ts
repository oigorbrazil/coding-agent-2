import { readAppEnvKey, deleteAppEnvKey, setAppEnvKey } from '../../app-env'
// Why: a nested terminal can inherit prior OpenCode/Pi/OMP overlay env; restore the user's recorded source dir, else strip only Coding Agent 2-owned values.
export function restoreOrStripOverlayEnv(
  baseEnv: Record<string, string>,
  keys: {
    primary: string
    overlay: string
    source: string
    preserveExplicitPrimary?: boolean
  },
  inheritedEnv: NodeJS.ProcessEnv = process.env
): void {
  const sourceValue =
    readAppEnvKey(baseEnv, keys.source) ?? readAppEnvKey(inheritedEnv, keys.source)
  const overlayValue =
    readAppEnvKey(baseEnv, keys.overlay) ?? readAppEnvKey(inheritedEnv, keys.overlay)
  // Source-only markers from older launches still identify an inherited overlay.
  const preservePrimary =
    keys.preserveExplicitPrimary &&
    Boolean(overlayValue) &&
    readAppEnvKey(baseEnv, keys.primary) !== undefined &&
    readAppEnvKey(baseEnv, keys.primary) !== overlayValue
  if (sourceValue && !preservePrimary) {
    setAppEnvKey(baseEnv, keys.primary, sourceValue)
  } else if (overlayValue && readAppEnvKey(baseEnv, keys.primary) === overlayValue) {
    deleteAppEnvKey(baseEnv, keys.primary)
  }
  deleteAppEnvKey(baseEnv, keys.overlay)
  deleteAppEnvKey(baseEnv, keys.source)
}
