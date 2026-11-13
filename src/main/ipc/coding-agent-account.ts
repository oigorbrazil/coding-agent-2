import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { CodingAgentAccountProfileUpdate } from '../../shared/coding-agent-account'
import { translateMain } from '../i18n/main-i18n'
import {
  getAccount,
  readPhotoFile,
  saveAccountProfile,
  sendEmailCode,
  setAccountServer,
  signOutAccount,
  verifyEmailCode
} from '../account/coding-agent-account-service'

export function registerCodingAgentAccountHandlers(): void {
  ipcMain.handle('account:get', () => getAccount())
  ipcMain.handle('account:saveProfile', (_event, update: CodingAgentAccountProfileUpdate) =>
    saveAccountProfile({
      name: String(update?.name ?? ''),
      email: String(update?.email ?? ''),
      photo: typeof update?.photo === 'string' ? update.photo : null
    })
  )
  ipcMain.handle('account:pickPhoto', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender)
    const options = {
      title: translateMain('codingOpus.dialog.pickPhoto', 'Choose a profile photo'),
      properties: ['openFile' as const],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
    }
    const picked = owner
      ? await dialog.showOpenDialog(owner, options)
      : await dialog.showOpenDialog(options)
    const path = picked.filePaths[0]
    if (picked.canceled || !path) {
      return { ok: true as const, value: null }
    }
    try {
      return { ok: true as const, value: await readPhotoFile(path) }
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : String(error) }
    }
  })
  ipcMain.handle('account:setServer', (_event, url: unknown, anonKey: unknown) =>
    setAccountServer(String(url ?? ''), String(anonKey ?? ''))
  )
  ipcMain.handle('account:sendCode', () => sendEmailCode())
  ipcMain.handle('account:verifyCode', (_event, code: unknown) =>
    verifyEmailCode(String(code ?? ''))
  )
  ipcMain.handle('account:signOut', () => signOutAccount())
}
