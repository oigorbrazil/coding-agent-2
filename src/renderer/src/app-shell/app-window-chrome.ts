import {
  isPairedWebClientWindow,
  shouldRenderDesktopWindowChrome
} from '@/lib/desktop-window-chrome'

export const isMac = navigator.userAgent.includes('Mac')
const isWindows = !isMac && navigator.userAgent.includes('Windows')
export const shortcutPlatform: NodeJS.Platform = isMac ? 'darwin' : isWindows ? 'win32' : 'linux'
// Custom chrome belongs to Windows/Linux desktops; paired browser tabs need no window controls.
export const hasCustomTitleBar = shouldRenderDesktopWindowChrome({
  platform: shortcutPlatform,
  isWebClient: isPairedWebClientWindow()
})

// Offset surfaces by three 36px controls and their 24px top bar.
export const WINDOW_CONTROLS_WIDTH = hasCustomTitleBar ? '108px' : '0px'
export const WINDOW_CONTROLS_HEIGHT = hasCustomTitleBar ? '24px' : '0px'

// Only macOS desktop windows need left-side traffic-light clearance.
export const hasMacTrafficLights = isMac && !isPairedWebClientWindow()
export const MAC_TRAFFIC_LIGHTS_WIDTH = hasMacTrafficLights ? '80px' : '0px'
