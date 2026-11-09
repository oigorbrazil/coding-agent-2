import { ipcRenderer } from 'electron'
import type { CodingOpusApi } from './coding-opus-api'

export const codingOpusApi = {
  skillStatus: () => ipcRenderer.invoke('codingOpus:skillStatus'),
  installSkill: (targets) => ipcRenderer.invoke('codingOpus:installSkill', targets),
  readPlaybooks: () => ipcRenderer.invoke('codingOpus:readPlaybooks'),
  savePlaybooks: (text) => ipcRenderer.invoke('codingOpus:savePlaybooks', text),
  revealPlaybooks: () => ipcRenderer.invoke('codingOpus:revealPlaybooks'),
  secondBrainOverview: () => ipcRenderer.invoke('codingOpus:secondBrainOverview'),
  secondBrainFind: (query, route) => ipcRenderer.invoke('codingOpus:secondBrainFind', query, route),
  secondBrainRead: (path) => ipcRenderer.invoke('codingOpus:secondBrainRead', path),
  secondBrainRecord: (request) => ipcRenderer.invoke('codingOpus:secondBrainRecord', request),
  secondBrainInstall: () => ipcRenderer.invoke('codingOpus:secondBrainInstall'),
  secondBrainReveal: (path) => ipcRenderer.invoke('codingOpus:secondBrainReveal', path),
  skillCatalog: (scope) => ipcRenderer.invoke('codingOpus:skillCatalog', scope),
  installCatalogSkill: (name, targets, scope) =>
    ipcRenderer.invoke('codingOpus:installCatalogSkill', name, targets, scope),
  removeCatalogSkill: (name, targets, scope) =>
    ipcRenderer.invoke('codingOpus:removeCatalogSkill', name, targets, scope)
} satisfies CodingOpusApi
