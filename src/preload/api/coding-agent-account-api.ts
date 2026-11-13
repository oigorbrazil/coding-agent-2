import { ipcRenderer } from 'electron'
import type {
  CodingAgentAccountProfileUpdate,
  CodingAgentAccountResult
} from '../../shared/coding-agent-account'

export type CodingAgentAccountApi = {
  get: () => Promise<CodingAgentAccountResult>
  saveProfile: (update: CodingAgentAccountProfileUpdate) => Promise<CodingAgentAccountResult>
  /** Data URL of a picked local image; null when cancelled. */
  pickPhoto: () => Promise<{ ok: true; value: string | null } | { ok: false; error: string }>
  setServer: (url: string, anonKey: string) => Promise<CodingAgentAccountResult>
  sendCode: () => Promise<CodingAgentAccountResult>
  verifyCode: (code: string) => Promise<CodingAgentAccountResult>
  signOut: () => Promise<CodingAgentAccountResult>
}

export const codingAgentAccountApi = {
  get: () => ipcRenderer.invoke('account:get'),
  saveProfile: (update) => ipcRenderer.invoke('account:saveProfile', update),
  pickPhoto: () => ipcRenderer.invoke('account:pickPhoto'),
  setServer: (url, anonKey) => ipcRenderer.invoke('account:setServer', url, anonKey),
  sendCode: () => ipcRenderer.invoke('account:sendCode'),
  verifyCode: (code) => ipcRenderer.invoke('account:verifyCode', code),
  signOut: () => ipcRenderer.invoke('account:signOut')
} satisfies CodingAgentAccountApi
