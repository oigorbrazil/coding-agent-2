import { useCallback, useEffect, useRef, useState } from 'react'
import { PlaybooksPage } from '../../src/renderer/src/components/settings/coding-opus/playbooks/PlaybooksPage'

const STAMP_POLL_MS = 3000

const stampApi = () =>
  (window as unknown as { api: { codingOpus: { playbooksStamp: () => Promise<number> } } }).api
    .codingOpus

/** Full-window editor; reloads when the file changes elsewhere (the Coding Agent, an agent, by hand). */
export function CodingOpusEditorApp(): React.JSX.Element {
  const [generation, setGeneration] = useState(0)
  const [outsideChange, setOutsideChange] = useState(false)
  const editedRef = useRef(false)
  const stampRef = useRef<number | null>(null)
  // Set while this editor's own save is landing, so the stamp it moves does not remount the editor.
  const selfSaveRef = useRef(false)
  const pt = navigator.language.toLowerCase().startsWith('pt')

  const onEditedChange = useCallback((edited: boolean) => {
    editedRef.current = edited
    if (!edited) {
      setOutsideChange(false)
    }
  }, [])

  const onSaved = useCallback(() => {
    selfSaveRef.current = true
    void stampApi()
      .playbooksStamp()
      .then((stamp) => {
        stampRef.current = stamp
      })
      .catch(() => undefined)
      .finally(() => {
        selfSaveRef.current = false
      })
  }, [])

  useEffect(() => {
    const api = stampApi()
    let live = true
    const check = async (): Promise<void> => {
      const stamp = await api.playbooksStamp().catch(() => null)
      if (!live || stamp === null) {
        return
      }
      const previous = stampRef.current
      stampRef.current = stamp
      if (previous === null || previous === stamp) {
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
  }, [])

  return (
    <div className="ca1-playbook-tokens editor-shell">
      {outsideChange ? (
        <div className="editor-notice">
          {pt
            ? 'O arquivo de playbooks também mudou fora desta página; a edição que você está fazendo aqui o substitui ao salvar.'
            : 'The playbooks file also changed outside this page; the edit you are making here replaces it when it saves.'}
        </div>
      ) : null}
      <div className="editor-body">
        <PlaybooksPage key={generation} onEditedChange={onEditedChange} onSaved={onSaved} />
      </div>
    </div>
  )
}
