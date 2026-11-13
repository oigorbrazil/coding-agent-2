import './playbooks/playbook-tokens.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PlaybooksPage } from './playbooks/PlaybooksPage'
import { useTranslate } from '@/i18n/use-translate'

const STAMP_POLL_MS = 3000

/**
 * Coding Agent 1's visual playbooks editor over the one file the Coding Opus skill plans with.
 * Edits the skill or an agent makes to that file show up here on their own.
 */
export function CodingOpusPlaybooksPane(): React.JSX.Element {
  const t = useTranslate()
  const api = window.api.codingOpus
  const [generation, setGeneration] = useState(0)
  const [outsideChange, setOutsideChange] = useState(false)
  const editedRef = useRef(false)
  const stampRef = useRef<number | null>(null)
  // Set while this editor's own save is landing, so the stamp it moves does not remount the editor.
  const selfSaveRef = useRef(false)

  const onEditedChange = useCallback((edited: boolean) => {
    editedRef.current = edited
    if (!edited) {
      setOutsideChange(false)
    }
  }, [])

  useEffect(() => {
    if (!api) {
      return
    }
    let live = true
    const check = async (): Promise<void> => {
      const stamp = await api.playbooksStamp().catch(() => null)
      if (!live || stamp === null) {
        return
      }
      const previous = stampRef.current
      stampRef.current = stamp
      if (previous === null || stamp === previous) {
        return
      }
      if (selfSaveRef.current) {
        return
      }
      if (editedRef.current) {
        setOutsideChange(true)
      } else {
        setGeneration((value) => value + 1)
      }
    }
    void check()
    const timer = window.setInterval(() => void check(), STAMP_POLL_MS)
    return () => {
      live = false
      window.clearInterval(timer)
    }
  }, [api])

  const onSaved = useCallback(() => {
    if (!api) {
      return
    }
    selfSaveRef.current = true
    void api
      .playbooksStamp()
      .then((stamp) => {
        stampRef.current = stamp
      })
      .catch(() => undefined)
      .finally(() => {
        selfSaveRef.current = false
      })
  }, [api])

  if (!api) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('codingOpus.desktopOnly', 'Available in the desktop app only.')}
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {outsideChange ? (
        <p className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
          {t(
            'codingOpus.playbooks.outsideChange',
            'The playbooks file also changed outside this screen; the edit you are making here replaces it when it saves.'
          )}
        </p>
      ) : null}
      <div className="ca1-playbook-tokens flex h-[calc(100vh-14rem)] min-h-[36rem] flex-col overflow-hidden rounded-md border border-border">
        <PlaybooksPage key={generation} onEditedChange={onEditedChange} onSaved={onSaved} />
      </div>
    </div>
  )
}
