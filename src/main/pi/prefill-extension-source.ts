import { appEnvReadExpression } from '../../shared/app-env-script'
import type { PiAgentKind } from '../../shared/pi-agent-kind'

export const ORCA_PI_PREFILL_EXTENSION_FILE = 'orca-prefill.ts'

// Keep draft variables agent-specific so Pi and OMP cannot consume each other's prefill.
type PrefillAgentKind = Exclude<PiAgentKind, 'prime-agent'>

const PREFILL_ENV_VAR_BY_KIND: Record<PrefillAgentKind, string> = {
  pi: 'ORCA_PI_PREFILL',
  omp: 'ORCA_OMP_PREFILL'
}

export function getPiPrefillExtensionSource(kind: PrefillAgentKind): string {
  return ['export default function (pi) {', ...getPiPrefillHandlerSourceLines(kind), '}', ''].join(
    '\n'
  )
}

export function getPiPrefillHandlerSourceLines(
  kind: PrefillAgentKind,
  wrapInStatusOwner = false
): string[] {
  const envVar = PREFILL_ENV_VAR_BY_KIND[kind]
  const register = wrapInStatusOwner && kind === 'omp' ? 'onStatus' : 'pi.on'
  return [
    `  ${register}('session_start', async (event, ctx) => {`,
    `    if (!${appEnvReadExpression('process.env', 'PANE_KEY')} || ctx?.hasUI === false) return`,
    ...(kind === 'pi' ? ["    if (event.reason !== 'startup') return"] : []),
    `    const prefill = ${appEnvReadExpression('process.env', envVar.slice(5))}`,
    "    if (!prefill || typeof ctx?.ui?.setEditorText !== 'function') return",
    `    delete process.env.${envVar}; delete process.env.CODING_AGENT_${envVar.slice(5)}`,
    '    try {',
    '      ctx.ui.setEditorText(prefill)',
    '    } catch {}',
    '  })'
  ]
}
