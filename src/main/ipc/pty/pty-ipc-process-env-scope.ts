import { readAppEnv, deleteAppEnv, setAppEnv } from '../../../shared/app-env'
// Split suites rewrite platform and agent-home environment; capture and restore the host values.
export function createPtyIpcProcessEnvScope() {
  const savedOpenCodeConfigDir = process.env.OPENCODE_CONFIG_DIR
  const savedOrcaOpenCodeConfigDir = readAppEnv(process.env, 'OPENCODE_CONFIG_DIR')
  const savedOrcaOpenCodeSourceConfigDir = readAppEnv(process.env, 'OPENCODE_SOURCE_CONFIG_DIR')
  const savedPiAgentDir = process.env.PI_CODING_AGENT_DIR
  const savedOrcaPiAgentDir = readAppEnv(process.env, 'PI_CODING_AGENT_DIR')
  const savedOrcaPiSourceAgentDir = readAppEnv(process.env, 'PI_SOURCE_AGENT_DIR')
  const savedOrcaCodexHome = readAppEnv(process.env, 'CODEX_HOME')
  const savedOrcaOmpAgentDir = readAppEnv(process.env, 'OMP_CODING_AGENT_DIR')
  const savedOrcaOmpSourceAgentDir = readAppEnv(process.env, 'OMP_SOURCE_AGENT_DIR')
  const savedOrcaOmpStatusExtension = readAppEnv(process.env, 'OMP_STATUS_EXTENSION')
  const savedPrimeAgentDir = process.env.PRIME_AGENT_CODING_AGENT_DIR
  const savedOrcaPrimeAgentSourceDir = readAppEnv(process.env, 'PRIME_AGENT_SOURCE_AGENT_DIR')
  const savedOrcaPrimeAgentStatusExtension = readAppEnv(process.env, 'PRIME_AGENT_STATUS_EXTENSION')
  const savedOrcaClaudeAgentStatusSettings = readAppEnv(process.env, 'CLAUDE_AGENT_STATUS_SETTINGS')
  const savedProcessPlatform = Object.getOwnPropertyDescriptor(process, 'platform')
  const savedDisableMacosLoginShell = process.env.ORCA_DISABLE_MACOS_LOGIN_SHELL
  const savedOrcaUserDataPath = process.env.ORCA_USER_DATA_PATH

  function applyTestEnvDefaults() {
    // POSIX is the default fixture; Windows cases explicitly opt in.
    Object.defineProperty(process, 'platform', {
      configurable: true,
      value: 'darwin'
    })
    // Disable the TCC argv wrapper except in its dedicated tests.
    process.env.ORCA_DISABLE_MACOS_LOGIN_SHELL = '1'
    delete process.env.OPENCODE_CONFIG_DIR
    deleteAppEnv(process.env, 'OPENCODE_SOURCE_CONFIG_DIR')
    deleteAppEnv(process.env, 'OPENCODE_CONFIG_DIR')
    deleteAppEnv(process.env, 'AGENT_HOOK_ENDPOINT')
    deleteAppEnv(process.env, 'CLAUDE_AGENT_STATUS_SETTINGS')
    delete process.env.PI_CODING_AGENT_DIR
    deleteAppEnv(process.env, 'PI_SOURCE_AGENT_DIR')
    deleteAppEnv(process.env, 'PI_CODING_AGENT_DIR')
    deleteAppEnv(process.env, 'CODEX_HOME')
    deleteAppEnv(process.env, 'OMP_SOURCE_AGENT_DIR')
    deleteAppEnv(process.env, 'OMP_CODING_AGENT_DIR')
    deleteAppEnv(process.env, 'OMP_STATUS_EXTENSION')
    delete process.env.PRIME_AGENT_CODING_AGENT_DIR
    deleteAppEnv(process.env, 'PRIME_AGENT_SOURCE_AGENT_DIR')
    deleteAppEnv(process.env, 'PRIME_AGENT_STATUS_EXTENSION')
  }

  function restoreProcessEnv() {
    if (savedProcessPlatform) {
      Object.defineProperty(process, 'platform', savedProcessPlatform)
    }
    if (savedDisableMacosLoginShell !== undefined) {
      process.env.ORCA_DISABLE_MACOS_LOGIN_SHELL = savedDisableMacosLoginShell
    } else {
      delete process.env.ORCA_DISABLE_MACOS_LOGIN_SHELL
    }
    if (savedOrcaUserDataPath !== undefined) {
      setAppEnv(process.env, 'USER_DATA_PATH', savedOrcaUserDataPath)
    } else {
      deleteAppEnv(process.env, 'USER_DATA_PATH')
    }
    if (savedOpenCodeConfigDir !== undefined) {
      process.env.OPENCODE_CONFIG_DIR = savedOpenCodeConfigDir
    } else {
      delete process.env.OPENCODE_CONFIG_DIR
    }
    if (savedOrcaOpenCodeConfigDir !== undefined) {
      setAppEnv(process.env, 'OPENCODE_CONFIG_DIR', savedOrcaOpenCodeConfigDir)
    } else {
      deleteAppEnv(process.env, 'OPENCODE_CONFIG_DIR')
    }
    if (savedOrcaOpenCodeSourceConfigDir !== undefined) {
      setAppEnv(process.env, 'OPENCODE_SOURCE_CONFIG_DIR', savedOrcaOpenCodeSourceConfigDir)
    } else {
      deleteAppEnv(process.env, 'OPENCODE_SOURCE_CONFIG_DIR')
    }
    if (savedPiAgentDir !== undefined) {
      process.env.PI_CODING_AGENT_DIR = savedPiAgentDir
    } else {
      delete process.env.PI_CODING_AGENT_DIR
    }
    if (savedOrcaPiAgentDir !== undefined) {
      setAppEnv(process.env, 'PI_CODING_AGENT_DIR', savedOrcaPiAgentDir)
    } else {
      deleteAppEnv(process.env, 'PI_CODING_AGENT_DIR')
    }
    if (savedOrcaPiSourceAgentDir === undefined) {
      deleteAppEnv(process.env, 'PI_SOURCE_AGENT_DIR')
    } else {
      setAppEnv(process.env, 'PI_SOURCE_AGENT_DIR', savedOrcaPiSourceAgentDir)
    }
    if (savedOrcaCodexHome === undefined) {
      deleteAppEnv(process.env, 'CODEX_HOME')
    } else {
      setAppEnv(process.env, 'CODEX_HOME', savedOrcaCodexHome)
    }
    if (savedOrcaOmpAgentDir !== undefined) {
      setAppEnv(process.env, 'OMP_CODING_AGENT_DIR', savedOrcaOmpAgentDir)
    } else {
      deleteAppEnv(process.env, 'OMP_CODING_AGENT_DIR')
    }
    if (savedOrcaOmpSourceAgentDir !== undefined) {
      setAppEnv(process.env, 'OMP_SOURCE_AGENT_DIR', savedOrcaOmpSourceAgentDir)
    } else {
      deleteAppEnv(process.env, 'OMP_SOURCE_AGENT_DIR')
    }
    if (savedOrcaOmpStatusExtension !== undefined) {
      setAppEnv(process.env, 'OMP_STATUS_EXTENSION', savedOrcaOmpStatusExtension)
    } else {
      deleteAppEnv(process.env, 'OMP_STATUS_EXTENSION')
    }
    if (savedPrimeAgentDir !== undefined) {
      process.env.PRIME_AGENT_CODING_AGENT_DIR = savedPrimeAgentDir
    } else {
      delete process.env.PRIME_AGENT_CODING_AGENT_DIR
    }
    if (savedOrcaPrimeAgentSourceDir !== undefined) {
      setAppEnv(process.env, 'PRIME_AGENT_SOURCE_AGENT_DIR', savedOrcaPrimeAgentSourceDir)
    } else {
      deleteAppEnv(process.env, 'PRIME_AGENT_SOURCE_AGENT_DIR')
    }
    if (savedOrcaPrimeAgentStatusExtension !== undefined) {
      setAppEnv(process.env, 'PRIME_AGENT_STATUS_EXTENSION', savedOrcaPrimeAgentStatusExtension)
    } else {
      deleteAppEnv(process.env, 'PRIME_AGENT_STATUS_EXTENSION')
    }
    if (savedOrcaClaudeAgentStatusSettings === undefined) {
      deleteAppEnv(process.env, 'CLAUDE_AGENT_STATUS_SETTINGS')
    } else {
      setAppEnv(process.env, 'CLAUDE_AGENT_STATUS_SETTINGS', savedOrcaClaudeAgentStatusSettings)
    }
  }

  return { applyTestEnvDefaults, restoreProcessEnv }
}
