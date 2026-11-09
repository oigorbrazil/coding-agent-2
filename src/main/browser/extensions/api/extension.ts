import { z } from 'zod'
import {
  defineBrowserExtensionMethod,
  registerBrowserExtensionNamespace
} from '../api-runtime/browser-extension-namespace-registry'

/** Electron's chrome.extension lacks these; Coding Agent 2 loads extensions without file or incognito access. */
export function registerExtensionNamespace(): void {
  registerBrowserExtensionNamespace('extension', {
    methods: {
      isAllowedFileSchemeAccess: defineBrowserExtensionMethod(z.tuple([]), () => false),
      isAllowedIncognitoAccess: defineBrowserExtensionMethod(z.tuple([]), () => false)
    },
    events: []
  })
}
