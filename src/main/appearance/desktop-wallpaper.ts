import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { nativeImage } from 'electron'
import { runProcess } from '@coding-agent/process-host'

// The backdrop is blurred heavily, so a small copy looks the same and keeps the IPC payload light.
const BACKDROP_WIDTH = 960

let cached: { path: string; mtimeMs: number; dataUrl: string } | null = null

/** Windows renders the current wallpaper (slideshows and Spotlight included) to this file. */
function transcodedWallpaperPath(): string | null {
  const appData = process.env.APPDATA
  return appData ? join(appData, 'Microsoft', 'Windows', 'Themes', 'TranscodedWallpaper') : null
}

async function registryWallpaperPath(): Promise<string | null> {
  try {
    const { stdout } = await runProcess({
      program: 'reg',
      args: ['query', 'HKCU\\Control Panel\\Desktop', '/v', 'WallPaper']
    })
    const match = /WallPaper\s+REG_SZ\s+(.+)/i.exec(stdout)
    return match?.[1]?.trim() || null
  } catch {
    return null
  }
}

async function existingFile(
  path: string | null
): Promise<{ path: string; mtimeMs: number } | null> {
  if (!path) {
    return null
  }
  try {
    const info = await stat(path)
    return info.isFile() ? { path, mtimeMs: info.mtimeMs } : null
  } catch {
    return null
  }
}

/** The desktop wallpaper as a small JPEG data URL, or null where it can't be read (non-Windows, solid color). */
export async function readDesktopWallpaperDataUrl(): Promise<string | null> {
  if (process.platform !== 'win32') {
    return null
  }
  const file =
    (await existingFile(transcodedWallpaperPath())) ??
    (await existingFile(await registryWallpaperPath()))
  if (!file) {
    return null
  }
  if (cached && cached.path === file.path && cached.mtimeMs === file.mtimeMs) {
    return cached.dataUrl
  }
  const image = nativeImage.createFromBuffer(await readFile(file.path))
  if (image.isEmpty()) {
    return null
  }
  const { width } = image.getSize()
  const small =
    width > BACKDROP_WIDTH ? image.resize({ width: BACKDROP_WIDTH, quality: 'good' }) : image
  const dataUrl = `data:image/jpeg;base64,${small.toJPEG(82).toString('base64')}`
  cached = { ...file, dataUrl }
  return dataUrl
}
