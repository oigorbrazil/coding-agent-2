import { readAppEnv } from '../../../shared/app-env'
import { RuntimeClientError } from '../../runtime-client'

export function resolveCompatibilityCliCommand(): 'orca' | 'orca-ide' | 'orca-dev' {
  const configured = readAppEnv(process.env, 'CLI_COMMAND')
  if (configured === 'orca' || configured === 'orca-ide' || configured === 'orca-dev') {
    return configured
  }
  return process.platform === 'linux' ? 'orca-ide' : 'orca'
}

export function resolvePackagedWindowsCompatibilityCommand(): 'orca' | 'orca-ide' | undefined {
  if (readAppEnv(process.env, 'WINDOWS_PACKAGED_CLI_LAUNCHER') !== '1') {
    return undefined
  }
  const command = readAppEnv(process.env, 'CLI_COMMAND')
  if (command === 'orca' || command === 'orca-ide') {
    return command
  }
  throw new RuntimeClientError(
    'invalid_argument',
    'The packaged Coding Agent 2 launcher did not provide a valid resume command. No question was created.'
  )
}

export async function flushOrchestrationStdout(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    process.stdout.write('', (error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

export function isDevCliInvocation(): boolean {
  return (
    readAppEnv(process.env, 'DEV_CLI_INVOCATION') === '1' ||
    /(?:orca-dev|coding-agent-2-dev)/.test(readAppEnv(process.env, 'USER_DATA_PATH') ?? '')
  )
}
