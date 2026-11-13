import { join } from 'node:path'

// Node scripts load this file directly (postinstall), so it keeps no relative imports.
function unzipBinOverride(): string | undefined {
  return process.env.CODING_AGENT_UNZIP_BIN ?? process.env.ORCA_UNZIP_BIN
}

export function getTarProgram(): string {
  return process.platform === 'win32'
    ? join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
    : 'tar'
}

/** The destination must already exist; callers extract only checksum-verified archives. */
export function getZipExtractorCommand(
  zipPath: string,
  extractDir: string
): { file: string; args: string[]; label: string } {
  if (process.platform === 'win32' && !unzipBinOverride()) {
    return {
      file: getTarProgram(),
      args: ['-xf', zipPath, '-C', extractDir],
      label: 'tar'
    }
  }
  return {
    file: unzipBinOverride() || 'unzip',
    args: ['-q', zipPath, '-d', extractDir],
    label: 'unzip'
  }
}
