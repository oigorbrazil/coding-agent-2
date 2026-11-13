import { useEffect, useState } from 'react'
import type { CodingAgentAccount } from '../../../../shared/coding-agent-account'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/utils'
import defaultAvatar from '../../assets/default-avatar.png'

/** Fired by Settings → Account after a save so every profile view re-reads it. */
export const ACCOUNT_CHANGED_EVENT = 'coding-agent-2:account-changed'

export function useCodingAgentAccount(): CodingAgentAccount | null {
  const [account, setAccount] = useState<CodingAgentAccount | null>(null)
  useEffect(() => {
    const api = window.api.codingAgentAccount
    if (!api) {
      return
    }
    const load = (): void => {
      void api.get().then((result) => setAccount(result.account))
    }
    load()
    window.addEventListener(ACCOUNT_CHANGED_EVENT, load)
    return () => window.removeEventListener(ACCOUNT_CHANGED_EVENT, load)
  }, [])
  return account
}

/** The profile from Settings → Account, pinned to the bottom of the sidebar like Coding Agent 1. */
export function SidebarProfileRow(): React.JSX.Element | null {
  const t = useTranslate()
  const account = useCodingAgentAccount()
  const openSettingsPage = useAppStore((s) => s.openSettingsPage)
  const openSettingsTarget = useAppStore((s) => s.openSettingsTarget)
  if (!account) {
    return null
  }
  const name = account.name.trim() || t('codingOpus.account.unnamed', 'Set up your profile')
  const subtitle = account.email
    ? account.email
    : t('codingOpus.account.localAccount', 'local account')

  return (
    <button
      type="button"
      onClick={() => {
        openSettingsPage()
        openSettingsTarget({ pane: 'account', repoId: null })
      }}
      aria-label={t('codingOpus.account.openAccount', 'Open account settings')}
      className="flex w-full items-center gap-2.5 border-t border-worktree-sidebar-border px-3 py-2 text-left transition-colors hover:bg-worktree-sidebar-foreground/8"
    >
      <img
        src={account.photo ?? defaultAvatar}
        alt=""
        className="size-8 shrink-0 rounded-full border border-worktree-sidebar-border object-cover"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-medium text-worktree-sidebar-foreground">
          {name}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-worktree-sidebar-foreground/55">
          {account.email ? (
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                account.emailVerified ? 'bg-status-success' : 'bg-worktree-sidebar-foreground/30'
              )}
            />
          ) : null}
          <span className="truncate">{subtitle}</span>
        </span>
      </span>
    </button>
  )
}
