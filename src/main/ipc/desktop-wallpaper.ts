import { ipcMain } from 'electron'
import { readDesktopWallpaperDataUrl } from '../appearance/desktop-wallpaper'

export function registerDesktopWallpaperHandlers(): void {
  ipcMain.handle('desktopWallpaper:read', () => readDesktopWallpaperDataUrl().catch(() => null))
}
