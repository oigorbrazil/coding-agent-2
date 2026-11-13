import { useEffect } from 'react'

/** Paints the OS desktop wallpaper behind the glass panels (DESIGN.md), refreshed when the window regains focus. */
export function useDesktopWallpaperBackdrop(): void {
  useEffect(() => {
    const api = window.api.desktopWallpaper
    if (!api) {
      return
    }
    const root = document.documentElement
    let live = true
    let current: string | null = null
    const refresh = async (): Promise<void> => {
      const dataUrl = await api.read().catch(() => null)
      if (!live || dataUrl === current) {
        return
      }
      current = dataUrl
      if (dataUrl) {
        root.style.setProperty('--environment-image', `url("${dataUrl}")`)
        root.setAttribute('data-desktop-wallpaper', '')
      } else {
        root.style.removeProperty('--environment-image')
        root.removeAttribute('data-desktop-wallpaper')
      }
    }
    void refresh()
    const onFocus = (): void => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      live = false
      window.removeEventListener('focus', onFocus)
    }
  }, [])
}
