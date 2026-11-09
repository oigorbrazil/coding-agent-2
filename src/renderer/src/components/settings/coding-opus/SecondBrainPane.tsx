import { useCallback, useEffect, useState } from 'react'
import { FolderOpen, RefreshCw, Search } from 'lucide-react'
import type {
  SecondBrainNote,
  SecondBrainNoteType,
  SecondBrainOverview
} from '../../../../../shared/coding-opus'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Textarea } from '../../ui/textarea'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/utils'

type NoteRow = {
  path: string
  title: string
  type: string | null
  updated: string | null
  tags: string[]
  match?: string | null
}

const NOTE_TYPES: SecondBrainNoteType[] = ['nota', 'decisao', 'estudo', 'ideia', 'meeting']

function NoteList({
  rows,
  selected,
  onSelect
}: {
  rows: NoteRow[]
  selected: string | null
  onSelect: (path: string) => void
}): React.JSX.Element {
  return (
    <ul className="scrollbar-sleek max-h-[28rem] divide-y divide-border overflow-y-auto">
      {rows.map((row) => (
        <li key={row.path}>
          <button
            type="button"
            onClick={() => onSelect(row.path)}
            className={cn(
              'flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-accent',
              selected === row.path && 'bg-accent'
            )}
          >
            <span className="truncate text-sm text-foreground">{row.title}</span>
            <span className="flex items-center gap-2 truncate font-mono text-[11px] text-muted-foreground">
              <span className="truncate">{row.path}</span>
              {row.type ? <span>{row.type}</span> : null}
              {row.updated ? <span>{row.updated}</span> : null}
              {row.match ? <span>{row.match}</span> : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function RecordNoteForm({
  folders,
  onRecorded
}: {
  folders: string[]
  onRecorded: (message: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  const api = window.api.codingOpus
  const [title, setTitle] = useState('')
  const [folder, setFolder] = useState('00-Inbox')
  const [type, setType] = useState<SecondBrainNoteType>('nota')
  const [summary, setSummary] = useState('')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (): Promise<void> => {
    if (!api || !title.trim()) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await api.secondBrainRecord({
        title,
        folder,
        type,
        summary,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      })
      if (result.ok) {
        setTitle('')
        setSummary('')
        setTags('')
        onRecorded(result.value)
      } else {
        setError(result.error)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <h4 className="text-sm font-semibold text-foreground">
        {t('codingOpus.brain.recordTitle', 'Record a note')}
      </h4>
      <Input
        value={title}
        placeholder={t('codingOpus.brain.titlePlaceholder', 'Title')}
        onChange={(event) => setTitle(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-1">
        {NOTE_TYPES.map((entry) => (
          <Button
            key={entry}
            size="xs"
            variant={type === entry ? 'secondary' : 'ghost'}
            onClick={() => setType(entry)}
          >
            {entry}
          </Button>
        ))}
        <select
          className="ml-auto h-7 rounded-md border border-input bg-transparent px-2 text-xs text-foreground dark:bg-input/30"
          value={folder}
          onChange={(event) => setFolder(event.target.value)}
        >
          {[...new Set(['00-Inbox', ...folders])].map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <Textarea
        value={summary}
        placeholder={t('codingOpus.brain.summaryPlaceholder', 'Summary')}
        onChange={(event) => setSummary(event.target.value)}
      />
      <Input
        value={tags}
        placeholder={t('codingOpus.brain.tagsPlaceholder', 'Tags, separated by commas')}
        onChange={(event) => setTags(event.target.value)}
      />
      <div className="flex items-center gap-2">
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
        <Button
          size="sm"
          className="ml-auto"
          disabled={busy || !title.trim()}
          onClick={() => void submit()}
        >
          {t('codingOpus.brain.record', 'Record with brain.py')}
        </Button>
      </div>
    </div>
  )
}

export function SecondBrainPane(): React.JSX.Element {
  const t = useTranslate()
  const api = window.api.codingOpus
  const [overview, setOverview] = useState<SecondBrainOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [route, setRoute] = useState<string | null>(null)
  const [hits, setHits] = useState<NoteRow[] | null>(null)
  const [note, setNote] = useState<SecondBrainNote | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!api) {
      return
    }
    const result = await api.secondBrainOverview()
    if (result.ok) {
      setOverview(result.value)
      setError(null)
    } else {
      setError(result.error)
    }
  }, [api])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!api) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('codingOpus.desktopOnly', 'Available in the desktop app only.')}
      </p>
    )
  }

  const search = async (): Promise<void> => {
    if (!query.trim()) {
      setHits(null)
      return
    }
    setBusy(true)
    try {
      const result = await api.secondBrainFind(query, route)
      if (result.ok) {
        setHits(result.value)
        setError(null)
      } else {
        setError(result.error)
      }
    } finally {
      setBusy(false)
    }
  }

  const open = async (path: string): Promise<void> => {
    const result = await api.secondBrainRead(path)
    if (result.ok) {
      setNote(result.value)
    } else {
      setError(result.error)
    }
  }

  const install = async (): Promise<void> => {
    setBusy(true)
    try {
      const result = await api.secondBrainInstall()
      if (result.ok) {
        setInfo(result.value)
        await refresh()
      } else {
        setError(result.error)
      }
    } finally {
      setBusy(false)
    }
  }

  const where = overview?.where
  const folders = overview?.folders ?? []
  const rows: NoteRow[] = hits ?? overview?.recent ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div
            className="truncate font-mono text-xs text-muted-foreground"
            title={where?.secondBrain}
          >
            {where?.secondBrain ?? t('codingOpus.brain.loading', 'Locating the second brain…')}
          </div>
          {overview ? (
            <div className="text-xs text-muted-foreground">
              {where?.exists
                ? t('codingOpus.brain.count', '{{value0}} notes in {{value1}} folders', {
                    value0: String(overview.totalNotes),
                    value1: String(folders.length)
                  })
                : t('codingOpus.brain.missing', 'No second brain at this location yet.')}
            </div>
          ) : null}
        </div>
        {where && !where.exists ? (
          <Button size="sm" disabled={busy} onClick={() => void install()}>
            {t('codingOpus.brain.install', 'Create second brain')}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => void api.secondBrainReveal()}>
          <FolderOpen />
          {t('codingOpus.brain.reveal', 'Open folder')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void refresh()}>
          <RefreshCw />
          {t('codingOpus.brain.refresh', 'Refresh')}
        </Button>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {info ? (
        <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{info}</pre>
      ) : null}

      {where?.exists ? (
        <>
          <div className="flex flex-wrap gap-1">
            <Button
              size="xs"
              variant={route === null ? 'secondary' : 'ghost'}
              onClick={() => setRoute(null)}
            >
              {t('codingOpus.brain.allFolders', 'All folders')}
            </Button>
            {folders.map((folder) => (
              <Button
                key={folder.name}
                size="xs"
                variant={route === folder.name ? 'secondary' : 'ghost'}
                onClick={() => setRoute(folder.name)}
              >
                {folder.name}
                <span className="text-muted-foreground">{folder.notes}</span>
              </Button>
            ))}
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void search()
            }}
          >
            <Input
              value={query}
              placeholder={t(
                'codingOpus.brain.searchPlaceholder',
                'Search titles, tags and aliases (brain.py find)'
              )}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button size="sm" type="submit" variant="outline" disabled={busy}>
              <Search />
              {t('codingOpus.brain.search', 'Search')}
            </Button>
          </form>

          <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="rounded-md border border-border">
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <span className="text-xs font-medium text-foreground">
                  {hits
                    ? t('codingOpus.brain.results', 'Results')
                    : t('codingOpus.brain.recent', 'Recently changed')}
                </span>
                <Badge variant="outline">{rows.length}</Badge>
                {hits ? (
                  <Button
                    size="xs"
                    variant="ghost"
                    className="ml-auto"
                    onClick={() => setHits(null)}
                  >
                    {t('codingOpus.brain.clear', 'Clear')}
                  </Button>
                ) : null}
              </div>
              {rows.length > 0 ? (
                <NoteList
                  rows={rows}
                  selected={note?.path ?? null}
                  onSelect={(path) => void open(path)}
                />
              ) : (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  {t('codingOpus.brain.empty', 'No notes found.')}
                </p>
              )}
            </div>
            <div className="min-w-0 rounded-md border border-border">
              {note ? (
                <>
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      {note.path}
                    </span>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="ml-auto"
                      onClick={() => void api.secondBrainReveal(note.path)}
                    >
                      <FolderOpen />
                      {t('codingOpus.brain.showNote', 'Show in folder')}
                    </Button>
                  </div>
                  <pre className="scrollbar-sleek max-h-[28rem] overflow-auto px-3 py-2 font-mono text-xs leading-5 whitespace-pre-wrap text-foreground">
                    {note.text}
                  </pre>
                </>
              ) : (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  {t('codingOpus.brain.pick', 'Pick a note to read it here.')}
                </p>
              )}
            </div>
          </div>

          <RecordNoteForm
            folders={folders.map((folder) => folder.name).filter((name) => name !== '.')}
            onRecorded={(message) => {
              setInfo(message)
              void refresh()
            }}
          />
        </>
      ) : null}
    </div>
  )
}
