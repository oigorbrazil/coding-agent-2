import { readAppEnv } from '../../shared/app-env'

type OrcadWsPortOptions = {
  wsPort?: number
  preferPinnedWsPort?: boolean
  requirePinnedWsPort?: boolean
}

/** Honor explicit ports; managed launches permit fallback because WSL distros share loopback. */
export function orcadWsPortOptions(
  port: number | undefined,
  env: NodeJS.ProcessEnv = process.env
): OrcadWsPortOptions {
  if (port === undefined) {
    return {}
  }
  const managed = Boolean(readAppEnv(env, 'ORCAD_MANAGED_ACTIVATION_ROOT'))
  return {
    wsPort: port,
    preferPinnedWsPort: true,
    ...(managed ? {} : { requirePinnedWsPort: true })
  }
}
