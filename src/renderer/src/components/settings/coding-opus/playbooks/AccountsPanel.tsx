import { ArrowDown, ArrowUp } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type {
  CodingOpusAccountProvider,
  CodingOpusAccountRow,
  CodingOpusAccounts
} from '../../../../../../shared/coding-opus'
import { usePlaybooks } from './context'
import { Hint, PanelHead, Section } from './fields'
import { ProviderMark } from './ProviderMark'
import styles from './Playbooks.module.css'
import { getIntlLocale } from '@/i18n/i18n'

export const ACCOUNT_PROVIDERS: readonly CodingOpusAccountProvider[] = ['codex', 'claude']

type Load =
  | { state: 'loading' }
  | { state: 'error'; error: string }
  | { state: 'ready'; accounts: CodingOpusAccounts }

function accountsApi() {
  // The desktop app and the skill's local server both expose this surface; older hosts lack it.
  const api = window.api?.codingOpus
  return typeof api?.readAccounts === 'function' && typeof api.orderAccounts === 'function'
    ? api
    : null
}

function resetText(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(getIntlLocale(), { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

function QuotaLine({ row }: { row: CodingOpusAccountRow }) {
  const { t } = usePlaybooks()
  const quota = row.quota
  if (!quota) {
    return <p className={styles.line}>{t('playbooks.accountNoQuota')}</p>
  }
  const tone = quota.blocked ? styles.danger : quota.low ? styles.warn : styles.ok
  return (
    <p className={styles.line}>
      <span className={tone}>
        {t('playbooks.accountQuota', {
          percent: Math.round(quota.usedPercent),
          window: quota.window,
          time: resetText(quota.resetsAt)
        })}
      </span>
      {quota.blocked ? ` · ${t('playbooks.accountBlocked')}` : ''}
      {quota.stale ? ` · ${t('playbooks.accountStale')}` : ''}
    </p>
  )
}

export function AccountsPanel({ provider }: { provider: CodingOpusAccountProvider }) {
  const { t, s } = usePlaybooks()
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [saving, setSaving] = useState(false)
  const label = s.catalog[provider]?.label ?? provider

  const refresh = useCallback(async () => {
    const api = accountsApi()
    if (!api) {
      setLoad({ state: 'error', error: t('playbooks.accountsUnsupported') })
      return
    }
    const result = await api.readAccounts()
    setLoad(
      result.ok
        ? { state: 'ready', accounts: result.accounts }
        : { state: 'error', error: result.error }
    )
  }, [t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const rows = load.state === 'ready' ? load.accounts.providers[provider] : []
  const rotation = rows.filter((row) => row.inRotation)

  const move = async (index: number, step: number) => {
    const api = accountsApi()
    const to = index + step
    if (!api || to < 0 || to >= rotation.length) {
      return
    }
    const names = rotation.map((row) => row.name)
    ;[names[index], names[to]] = [names[to], names[index]]
    setSaving(true)
    const result = await api.orderAccounts(provider, names)
    setSaving(false)
    setLoad(
      result.ok
        ? { state: 'ready', accounts: result.accounts }
        : { state: 'error', error: result.error }
    )
  }

  const origin = (row: CodingOpusAccountRow): string =>
    row.from === 'cli'
      ? t('playbooks.accountFromCli')
      : row.from === 'coding-agent'
        ? t('playbooks.accountFromAgent')
        : t('playbooks.accountFromOpus')

  return (
    <>
      <PanelHead
        kind={t('playbooks.kindAccounts')}
        title={t('playbooks.accountsTitle', { provider: label })}
        mark={<ProviderMark id={provider} size={16} />}
      />
      <Hint>{t('playbooks.accountsHint')}</Hint>
      {load.state === 'loading' ? <Hint>{t('playbooks.accountsLoading')}</Hint> : null}
      {load.state === 'error' ? (
        <p className={`${styles.line} ${styles.danger}`}>{load.error}</p>
      ) : null}
      {load.state === 'ready' ? (
        <Section title={t('playbooks.accountsOrder')}>
          <div className={styles.cards}>
            {rows.map((row) => {
              const index = rotation.indexOf(row)
              return (
                <div key={row.name} className={styles.card}>
                  <header>
                    <b>
                      {index !== -1 ? `${index + 1}. ` : ''}
                      {row.from === 'cli'
                        ? t('playbooks.accountDefault', { provider: label })
                        : row.name}
                    </b>
                    {index !== -1 && rotation.length > 1 ? (
                      <span className={styles.mini}>
                        <button
                          type="button"
                          aria-label={t('playbooks.earlier')}
                          title={t('playbooks.earlier')}
                          disabled={saving || index === 0}
                          onClick={() => void move(index, -1)}
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          aria-label={t('playbooks.later')}
                          title={t('playbooks.later')}
                          disabled={saving || index === rotation.length - 1}
                          onClick={() => void move(index, 1)}
                        >
                          <ArrowDown size={12} />
                        </button>
                      </span>
                    ) : null}
                  </header>
                  <p className={styles.line}>
                    {origin(row)}
                    {row.email ? ` · ${row.email}` : ''}
                    {row.activeInCodingAgent ? ` · ${t('playbooks.accountActive')}` : ''}
                  </p>
                  {row.ready ? (
                    <QuotaLine row={row} />
                  ) : (
                    <p className={`${styles.line} ${styles.warn}`}>
                      {t('playbooks.accountNotReady')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          {rows.length <= 1 ? <Hint>{t('playbooks.accountsOnlyDefault')}</Hint> : null}
        </Section>
      ) : null}
      <Section title={t('playbooks.accountsManageTitle')}>
        <Hint>{t('playbooks.accountsManage')}</Hint>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={() => void refresh()}>
            {t('playbooks.accountsRefresh')}
          </button>
        </div>
      </Section>
    </>
  )
}
