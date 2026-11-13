import { ipcRenderer } from 'electron'

export type DesktopWallpaperApi = {
  /** The OS desktop wallpaper as a small data URL for the glass backdrop; null when unavailable. */
  read: () => Promise<string | null>
}

export const desktopWallpaperApi = {
  read: () => ipcRenderer.invoke('desktopWallpaper:read')
} satisfies DesktopWallpaperApi
