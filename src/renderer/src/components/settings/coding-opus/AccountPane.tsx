import { useEffect, useState } from 'react'
import { Check, LogOut, Mail, Upload, X } from 'lucide-react'
import type {
  CodingAgentAccount,
  CodingAgentAccountResult
} from '../../../../../shared/coding-agent-account'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '../../../store/index'
import { ACCOUNT_CHANGED_EVENT } from '../../sidebar/SidebarProfileRow'
import defaultAvatar from '../../../assets/default-avatar.png'
import { runWithBusyFlag } from '@/lib/busy-flag-task'

type Api = NonNullable<typeof window.api.codingAgentAccount>

function Avatar({ photo }: { photo: string | null }): React.JSX.Element {
  return (
    <img
      src={photo ?? defaultAvatar}
      alt=""
      className="size-16 shrink-0 rounded-full border border-border object-cover"
    />
  )
}

function Section({
  title,
  description,
  children
}: {
  title: string
  description: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-3 border-b border-border pb-6 last:border-b-0">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function useAccount(api: Api | undefined): {
  account: CodingAgentAccount | null
  error: string | null
  apply: (result: Promise<CodingAgentAccountResult>) => Promise<boolean>
} {
  const [account, setAccount] = useState<CodingAgentAccount | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    void api?.get().then((result) => setAccount(result.account))
  }, [api])
  const apply = async (pending: Promise<CodingAgentAccountResult>): Promise<boolean> => {
    const result = await pending
    setAccount(result.account)
    window.dispatchEvent(new Event(ACCOUNT_CHANGED_EVENT))
    setError(result.ok ? null : result.error)
    return result.ok
  }
  return { account, error, apply }
}

export function AccountPane(): React.JSX.Element {
  const t = useTranslate()
  const api = window.api.codingAgentAccount
  const openSettingsTarget = useAppStore((s) => s.openSettingsTarget)
  const { account, error, apply } = useAccount(api)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [serverUrl, setServerUrl] = useState('')
  const [serverKey, setServerKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (account) {
      setName(account.name)
      setEmail(account.email)
      setPhoto(account.photo)
      setPhotoUrl(account.photo?.startsWith('https://') ? account.photo : '')
      setServerUrl(account.server.url)
    }
  }, [account])

  if (!api) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('codingOpus.desktopOnly', 'Available in the desktop app only.')}
      </p>
    )
  }
  if (!account) {
    return (
      <p className="text-sm text-muted-foreground">{t('codingOpus.account.loading', 'Loading…')}</p>
    )
  }

  // Takes the started request, not a callback, so no state update runs inside a passed function.
  const run = async (pending: Promise<boolean>, success?: string): Promise<boolean> => {
    setNotice(null)
    return runWithBusyFlag(setBusy, async () => {
      const ok = await pending
      if (ok && success) {
        setNotice(success)
      }
      return ok
    })
  }
  const profileDirty = name !== account.name || email !== account.email || photo !== account.photo
  const saveProfile = async (): Promise<void> => {
    await run(
      apply(api.saveProfile({ name, email, photo })),
      t('codingOpus.account.saved', 'Profile saved.')
    )
  }
  const signOut = async (): Promise<void> => {
    await run(apply(api.signOut()))
  }
  const sendCode = async (): Promise<void> => {
    const sent = await run(
      apply(api.sendCode()),
      t('codingOpus.account.codeSent', 'Code sent to {{value0}}.', { value0: account.email })
    )
    setCodeSent(sent)
  }
  const verifyCode = async (): Promise<void> => {
    if (
      await run(apply(api.verifyCode(code)), t('codingOpus.account.confirmed', 'Email confirmed.'))
    ) {
      setCode('')
      setCodeSent(false)
    }
  }
  const saveServer = async (): Promise<void> => {
    if (
      await run(
        apply(api.setServer(serverUrl, serverKey)),
        t('codingOpus.account.serverSaved', 'Server saved.')
      )
    ) {
      setServerKey('')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Section
        title={t('codingOpus.account.profile', 'Profile')}
        description={t('codingOpus.account.profileHint', 'How you appear inside the app.')}
      >
        <div className="flex items-start gap-4">
          <Avatar photo={photo} />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-foreground">
                {t('codingOpus.account.name', 'Display name')}
              </span>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-foreground">
                {t('codingOpus.account.photo', 'Profile photo')}
              </span>
              <div className="flex items-center gap-2">
                <Input
                  value={photoUrl}
                  placeholder={t('codingOpus.account.photoUrl', 'Photo link (https://…)')}
                  onChange={(event) => {
                    setPhotoUrl(event.target.value)
                    setPhoto(event.target.value.trim() || null)
                  }}
                />
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label={t('codingOpus.account.upload', 'Upload image')}
                  disabled={busy}
                  onClick={() =>
                    void api.pickPhoto().then((result) => {
                      if (result.ok && result.value) {
                        setPhoto(result.value)
                        setPhotoUrl('')
                      } else if (!result.ok) {
                        setNotice(result.error)
                      }
                    })
                  }
                >
                  <Upload />
                </Button>
                {photo ? (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t('codingOpus.account.removePhoto', 'Remove photo')}
                    onClick={() => {
                      setPhoto(null)
                      setPhotoUrl('')
                    }}
                  >
                    <X />
                  </Button>
                ) : null}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {t(
                  'codingOpus.account.photoHint',
                  'Use a link or upload a local image (up to 1 MB).'
                )}
              </span>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title={t('codingOpus.account.email', 'Email')}
        description={t(
          'codingOpus.account.emailHint',
          'Link an email to your account. Confirm it with a code to sign in on other machines.'
        )}
      >
        <div className="flex items-center gap-2">
          <Input
            type="email"
            value={email}
            placeholder={t('codingOpus.account.emailPlaceholder', 'you@example.com')}
            onChange={(event) => setEmail(event.target.value)}
          />
          {account.email && email === account.email ? (
            <Badge variant={account.emailVerified ? 'secondary' : 'outline'}>
              {account.emailVerified
                ? t('codingOpus.account.verified', 'Verified')
                : t('codingOpus.account.unverified', 'Not verified')}
            </Badge>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button size="sm" disabled={busy || !profileDirty} onClick={() => void saveProfile()}>
            {t('codingOpus.account.save', 'Save profile')}
          </Button>
        </div>
        {account.email && !profileDirty ? (
          account.signedIn ? (
            <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs">
              <Check className="size-4 text-status-success" />
              <span className="flex-1 text-foreground">
                {t('codingOpus.account.signedIn', 'Signed in as {{value0}}', {
                  value0: account.email
                })}
              </span>
              <Button size="xs" variant="ghost" disabled={busy} onClick={() => void signOut()}>
                <LogOut />
                {t('codingOpus.account.signOut', 'Sign out')}
              </Button>
            </div>
          ) : account.server.configured ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void sendCode()}>
                <Mail />
                {codeSent
                  ? t('codingOpus.account.resend', 'Send again')
                  : t('codingOpus.account.sendCode', 'Send code')}
              </Button>
              {codeSent ? (
                <>
                  <Input
                    variant="code"
                    className="w-36"
                    inputMode="numeric"
                    value={code}
                    placeholder="000000"
                    onChange={(event) => setCode(event.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={busy || code.trim().length < 6}
                    onClick={() => void verifyCode()}
                  >
                    {t('codingOpus.account.confirm', 'Confirm')}
                  </Button>
                </>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t(
                'codingOpus.account.needsServer',
                'The email is saved on this computer. Set up the sign-in server below to confirm it.'
              )}
            </p>
          )
        ) : null}
      </Section>

      <Section
        title={t('codingOpus.account.server', 'Sign-in server')}
        description={t(
          'codingOpus.account.serverHint',
          'Your own Supabase project sends the email codes. Paste its URL and anon (public) key from Project Settings → API.'
        )}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={serverUrl}
            placeholder="https://xxxx.supabase.co"
            onChange={(event) => setServerUrl(event.target.value)}
          />
          <Input
            type="password"
            value={serverKey}
            placeholder={
              account.server.configured
                ? t('codingOpus.account.keySaved', 'Key saved, paste to replace')
                : t('codingOpus.account.anonKey', 'anon public key')
            }
            onChange={(event) => setServerKey(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={account.server.configured ? 'secondary' : 'outline'}>
            {account.server.configured
              ? t('codingOpus.account.serverOn', 'Connected')
              : t('codingOpus.account.serverOff', 'Not set up')}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            disabled={busy || (!serverKey.trim() && serverUrl === account.server.url)}
            onClick={() => void saveServer()}
          >
            {t('codingOpus.account.saveServer', 'Save server')}
          </Button>
        </div>
      </Section>

      <Section
        title={t('codingOpus.account.language', 'Language')}
        description={t(
          'codingOpus.account.languageHint',
          'Menus, actions and messages follow this language.'
        )}
      >
        <div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openSettingsTarget({ pane: 'language', repoId: null })}
          >
            {t('codingOpus.account.openLanguage', 'Change language')}
          </Button>
        </div>
      </Section>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {notice && !error ? <p className="text-xs text-muted-foreground">{notice}</p> : null}
    </div>
  )
}
