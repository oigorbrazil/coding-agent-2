import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { isPackaged: false, getAppPath: () => '/app' } }))

const { codingOpusStateDir } = await import('./coding-opus-paths')

describe('codingOpusStateDir', () => {
  const env = { USERPROFILE: 'C:\\Users\\me', APPDATA: 'C:\\Users\\me\\AppData\\Roaming' }
  const current = join('C:\\Users\\me', '.coding-opus')
  const legacy = join('C:\\Users\\me\\AppData\\Roaming', 'CodingOpus')

  it('uses the home folder on Windows, outside the AppData that packaged apps virtualize', () => {
    expect(codingOpusStateDir(env, () => false, 'win32')).toBe(current)
    expect(codingOpusStateDir(env, (path) => path === current || path === legacy, 'win32')).toBe(
      current
    )
  })

  it('reads the AppData folder until the runner has copied it over', () => {
    expect(codingOpusStateDir(env, (path) => path === legacy, 'win32')).toBe(legacy)
  })

  it('keeps the XDG folder elsewhere', () => {
    expect(codingOpusStateDir({ XDG_CONFIG_HOME: '/home/me/.config' }, () => false, 'linux')).toBe(
      join('/home/me/.config', 'coding-opus')
    )
  })
})
