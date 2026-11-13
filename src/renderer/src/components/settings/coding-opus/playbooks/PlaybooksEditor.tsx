/* oxlint-disable max-lines -- ported as-is from Coding Agent 1; split when this editor is next reworked. */
import { Plus, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { type MessageKey, useT } from '@/lib/coding-opus-playbooks/i18n'
import {
  BUDGETS,
  CHECKS,
  ON_BOTH_CRITICAL,
  ROUTES,
  SPENT_STEPS,
  type TaskId,
  TASKS
} from '@/lib/coding-opus-playbooks/catalog'
import { type DocPort, removeEdge, removeNode } from '@/lib/coding-opus-playbooks/flowDoc'
import {
  addPlaybook,
  applyDoc,
  attachDocs,
  buildDocView,
  hasProblems,
  saveLayout
} from '@/lib/coding-opus-playbooks/flowView'
import { buildGraph } from '@/lib/coding-opus-playbooks/graph'
import { readLiveUsage } from '@/lib/coding-opus-playbooks/liveUsage'
import { formatUsd } from '@/lib/coding-opus-playbooks/prices'
import {
  activeOrder,
  applyLiveUsage,
  createPlaybooksState,
  isEdited,
  lowProviders,
  type PlaybooksState,
  providerLabel,
  routedVia,
  toYaml,
  type Workflow,
  workflowNow
} from '@/lib/coding-opus-playbooks/state'
import {
  getCachedCodexUsage,
  getClaudeUsage,
  isLightTheme,
  orchestratorSavePlaybooks,
  pushToast,
  type SkillPlaybooks,
  useAppliedTheme
} from '@/lib/coding-opus-playbooks/host'
import { PlaybooksContext } from './context'
import { Select } from './fields'
import { FlowCanvas } from './FlowCanvas'
import { ACCOUNT_PROVIDERS } from './AccountsPanel'
import { MODEL_UPDATES_ID } from './ModelUpdatesPanel'
import { CHECK_KEYS, Inspector, routingName, taskLabel } from './Inspector'
import { NodeCanvas } from './NodeCanvas'
import styles from './Playbooks.module.css'
import { ProviderMark } from './ProviderMark'
import { UsageBar } from './UsageBar'

/** Quiet time after the last edit before the file is written; both editors then reload it. */
const AUTOSAVE_MS = 800

const BUDGET_KEYS: Record<string, MessageKey> = {
  ok: 'playbooks.budget.ok',
  low: 'playbooks.budget.low'
}
const BOTH_KEYS: Record<string, MessageKey> = {
  ask: 'playbooks.both.ask',
  'run-cheapest': 'playbooks.both.runCheapest',
  block: 'playbooks.both.block'
}

export function PlaybooksEditor({
  file,
  initial,
  onSaved,
  onDiscard,
  onEditedChange
}: {
  file: SkillPlaybooks
  initial: PlaybooksState
  onSaved: (file: SkillPlaybooks) => void
  /** Drops the edits that cannot be saved because the playbooks have problems. */
  onDiscard: () => void
  /** Lets the host hold off reloading outside edits while there are unsaved changes. */
  onEditedChange?: (edited: boolean) => void
}) {
  const t = useT()
  const appliedTheme = useAppliedTheme()
  const claudeAccess = getClaudeUsage !== undefined
  const codexAccess = getCachedCodexUsage !== undefined
  const [s] = useState(initial)
  const [, setVersion] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [info, setInfo] = useState(false)
  const [yamlOpen, setYamlOpen] = useState(false)
  const [pulse, setPulse] = useState(0)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  // Every edit bumps the revision; a save clears the edited flags only if nothing changed meanwhile.
  const [revision, setRevision] = useState(0)
  const revisionRef = useRef(0)
  useEffect(() => {
    revisionRef.current = revision
  }, [revision])
  const [failedRevision, setFailedRevision] = useState<number | null>(null)
  // What the file holds as far as this editor knows, in the form this editor writes it.
  const [loadedText] = useState(() => toYaml(initial))
  const savedTextRef = useRef(loadedText)
  const snapshot = () => ({ yaml: toYaml(s), workflows: structuredClone(s.workflows) })
  const [history] = useState(() => ({ entries: [snapshot()], index: 0 }))
  const record = () => {
    const next = snapshot()
    const previous = history.entries[history.index]
    if (
      next.yaml === previous.yaml &&
      JSON.stringify(next.workflows) === JSON.stringify(previous.workflows)
    ) {
      return
    }
    history.entries.splice(history.index + 1)
    history.entries.push(next)
    if (history.entries.length > 100) {
      history.entries.shift()
    }
    history.index = history.entries.length - 1
  }
  const revise = () => {
    revisionRef.current += 1
    setRevision(revisionRef.current)
  }
  const restoreSnapshot = (entry: ReturnType<typeof snapshot>) => {
    const restored = createPlaybooksState(entry.yaml)
    restored.workflows = structuredClone(entry.workflows)
    restored.wf = restored.workflows[s.wf] ? s.wf : restored.wf
    Object.assign(s, restored, {
      task: s.task,
      usage: s.usage,
      liveUsage: s.liveUsage,
      checks: s.checks,
      budget: s.budget,
      spent: s.spent,
      globalEdited: true
    })
    setSelectedId(null)
    revise()
    bump()
  }
  const travel = (direction: number) => {
    const index = history.index + direction
    if (index < 0 || index >= history.entries.length) {
      return
    }
    restoreSnapshot(history.entries[index])
    history.index = index
  }
  const restoreBackup = () => {
    if (!file.backupText || saving) {
      return
    }
    try {
      const restored = createPlaybooksState(file.backupText)
      attachDocs(restored)
      restoreSnapshot({ yaml: toYaml(restored), workflows: restored.workflows })
      record()
    } catch (error) {
      pushToast({ title: t('playbooks.restoreFailed'), body: String(error) })
    }
  }

  const replaceYaml = (text: string) => {
    const replaced = createPlaybooksState(text)
    attachDocs(replaced)
    restoreSnapshot({ yaml: toYaml(replaced), workflows: replaced.workflows })
    record()
  }

  const bump = () => setVersion((value) => value + 1)
  const animate = () => setPulse((value) => value + 1)
  const touch = (global = false) => {
    const current = workflowNow(s)
    if (global) {
      s.globalEdited = true
    } else {
      current.edited = true
    }
    if (current.kind === 'playbook') {
      applyDoc(current)
    }
    record()
    revise()
    bump()
  }

  useEffect(() => {
    let live = true
    void readLiveUsage({
      claude: claudeAccess ? getClaudeUsage : undefined,
      codex: codexAccess ? getCachedCodexUsage : undefined
    }).then((usage) => {
      if (!live) {
        return
      }
      applyLiveUsage(s, usage)
      setVersion((value) => value + 1)
    })
    return () => {
      live = false
    }
  }, [s, claudeAccess, codexAccess])

  useEffect(() => {
    if (!copied) {
      return
    }
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  const wf = workflowNow(s)
  const docView = wf.kind === 'playbook' && wf.doc ? buildDocView(s, t, wf) : null
  const graph = docView ?? buildGraph(s, t, wf)
  const edited = isEdited(s)
  useEffect(() => {
    onEditedChange?.(edited)
  }, [edited, onEditedChange])
  const blocked = hasProblems(s)
  const problems = wf.kind === 'playbook' ? (wf.problems ?? []) : []
  const playbooks = Object.values(s.workflows).filter((w) => w.kind === 'playbook')
  const routing = Object.values(s.workflows).filter((w) => w.kind === 'routing')
  const title =
    wf.kind === 'playbook'
      ? wf.pb.name
      : t('playbooks.routingName', { name: routingName(t, wf.key) })
  const panelOpen = Boolean(selectedId) || info

  const openWorkflow = (w: Workflow) => {
    s.wf = w.id
    if (w.kind === 'routing') {
      s.routingWf = w.id
      touch(true)
    }
    setSelectedId(null)
    animate()
    bump()
  }

  const setScenario = <K extends 'task' | 'checks' | 'budget' | 'spent'>(
    key: K,
    value: PlaybooksState[K]
  ) => {
    s[key] = value
    animate()
    bump()
  }

  const removeSelection = () => {
    if (wf.kind !== 'playbook' || !wf.doc || !selectedId) {
      return
    }
    if (selectedId.startsWith('edge:')) {
      const [from, port, to] = selectedId.slice(5).split('|')
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: data-from/data-port are written by this canvas from node ids and DocPort values.
      removeEdge(wf.doc, { from, port: port as DocPort, to })
    } else {
      const node = wf.doc.nodes.find((n) => n.id === selectedId)
      if (!node || node.kind === 'start' || node.kind === 'end') {
        return
      }
      removeNode(wf.doc, node.id)
    }
    setSelectedId(null)
    touch()
  }

  const save = async () => {
    const at = revisionRef.current
    const text = toYaml(s)
    const markSaved = () => {
      if (revisionRef.current !== at) {
        return
      }
      Object.values(s.workflows).forEach((w) => {
        w.edited = false
        if (w.kind === 'playbook') {
          saveLayout(w)
        }
      })
      s.globalEdited = false
    }
    // Layout-only changes (a new canvas position, say) produce the same file; skip the write.
    if (text === savedTextRef.current) {
      markSaved()
      bump()
      return
    }
    setSaving(true)
    try {
      const saved = await orchestratorSavePlaybooks(text)
      savedTextRef.current = text
      markSaved()
      setFailedRevision(null)
      onSaved(saved)
      bump()
    } catch (error) {
      setFailedRevision(at)
      pushToast({ title: t('playbooks.saveFailed'), body: String(error) })
    } finally {
      setSaving(false)
    }
  }
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })

  useEffect(() => {
    if (!edited || blocked || saving || failedRevision === revision) {
      return
    }
    const timer = setTimeout(() => void saveRef.current(), AUTOSAVE_MS)
    return () => clearTimeout(timer)
  }, [revision, edited, blocked, saving, failedRevision])

  const workflowButton = (w: Workflow) => {
    const name = w.kind === 'playbook' ? w.pb.name : routingName(t, w.key)
    const count = w.kind === 'playbook' ? w.pb.phases.length : w.rules.length
    return (
      <button
        key={w.id}
        type="button"
        className={styles.wf}
        title={(w.kind === 'playbook' ? w.pb.pickWhen : undefined) ?? name}
        aria-current={w.id === s.wf}
        onClick={() => openWorkflow(w)}
      >
        <span className={styles.wfName}>{name}</span>
        {w.edited ? <span className={styles.editedDot} /> : null}
        <span className={styles.wfCount}>{count}</span>
      </button>
    )
  }

  const allLow = activeOrder(s).every((id) => lowProviders(s).includes(id))
  const profileName = (key: string) => s.profiles[key]?.name ?? key

  return (
    <PlaybooksContext.Provider
      // oxlint-disable-next-line react/jsx-no-constructed-context-values -- the editor re-renders on every edit through bump(); consumers read the live state each render.
      value={{
        s,
        t,
        theme: appliedTheme,
        lightTheme: isLightTheme(appliedTheme),
        touch,
        redraw: bump,
        select: setSelectedId,
        replaceYaml,
        selectedId
      }}
    >
      <div
        className={styles.editor}
        onKeyDownCapture={(event) => {
          const modifier = navigator.userAgent.includes('Mac') ? event.metaKey : event.ctrlKey
          if (
            !modifier ||
            event.altKey ||
            event.nativeEvent.isComposing ||
            event.key.toLowerCase() !== 'z'
          ) {
            return
          }
          event.preventDefault()
          event.stopPropagation()
          travel(event.shiftKey ? 1 : -1)
        }}
      >
        <header className={styles.toolbar}>
          <span className={styles.crumbLabel}>{t('playbooks.crumb')}</span>
          <span className={styles.crumb}>/</span>
          <span className={styles.crumbCurrent}>{title}</span>
          {edited ? <span className={styles.editedDot} title={t('playbooks.edited')} /> : null}
          <span className={styles.spacer} />
          <button
            type="button"
            className={styles.toolbarButton}
            disabled={history.index === 0}
            onClick={() => travel(-1)}
          >
            {t('playbooks.undo')}
          </button>
          <button
            type="button"
            className={styles.toolbarButton}
            disabled={history.index === history.entries.length - 1}
            onClick={() => travel(1)}
          >
            {t('playbooks.redo')}
          </button>
          <div className={styles.profiles} role="group" aria-label={t('playbooks.profiles')}>
            {Object.entries(s.profiles).map(([key, profile]) => {
              return (
                <button
                  key={key}
                  type="button"
                  title={profile.summary ?? ''}
                  aria-pressed={key === s.profile}
                  onClick={() => {
                    if (key === s.profile) {
                      return
                    }
                    s.profile = key
                    animate()
                    touch(true)
                  }}
                >
                  {profileName(key).toLowerCase()}
                </button>
              )
            })}
          </div>
          <UsageBar
            onChange={() => {
              animate()
              bump()
            }}
          />
          <button
            type="button"
            className={styles.toolbarButton}
            aria-pressed={info && !selectedId}
            onClick={() => {
              setInfo(!(info && !selectedId))
              setSelectedId(null)
            }}
          >
            {t('playbooks.details')}
          </button>
        </header>

        <nav className={styles.sidebar} aria-label={t('playbooks.sidebarTitle')}>
          <div className={styles.sideHeader}>
            <span className={styles.sideLabel}>{t('playbooks.sidebarTitle')}</span>
            <span className={styles.count}>{playbooks.length + routing.length}</span>
          </div>
          <div className={styles.sideList}>
            <div className={styles.group}>
              <div className={styles.groupTitle}>
                {t('playbooks.groupStrategies')}
                <button
                  type="button"
                  className={styles.groupAdd}
                  aria-label={t('playbooks.newPlaybook')}
                  title={t('playbooks.newPlaybook')}
                  onClick={() => {
                    const added = addPlaybook(s, t('playbooks.newPlaybookName'))
                    s.wf = added.id
                    setSelectedId(null)
                    setInfo(true)
                    animate()
                    touch(true)
                  }}
                >
                  <Plus size={12} />
                </button>
              </div>
              {playbooks.map(workflowButton)}
            </div>
            <div className={styles.group}>
              <div className={styles.groupTitle}>{t('playbooks.groupRouting')}</div>
              {routing.map(workflowButton)}
            </div>
            <div className={styles.group}>
              <div className={styles.groupTitle}>
                {t('playbooks.groupProviders')}
                <span className={styles.groupNote}>{profileName(s.profile)}</span>
              </div>
              {activeOrder(s).map((id, i) => {
                const via = routedVia(s, id)
                return (
                  <button
                    key={id}
                    type="button"
                    className={styles.wf}
                    aria-current={selectedId === `provider:${id}`}
                    onClick={() => setSelectedId(`provider:${id}`)}
                  >
                    <span className={styles.ico}>
                      <ProviderMark id={id} size={13} />
                    </span>
                    <span className={styles.wfName}>{providerLabel(s, id)}</span>
                    {via ? (
                      <span
                        className={styles.via}
                        title={t('playbooks.throughRoute', { route: ROUTES[via]?.label ?? via })}
                      >
                        <ProviderMark id={via} size={11} />
                      </span>
                    ) : null}
                    <span className={styles.wfCount}>{i + 1}</span>
                  </button>
                )
              })}
              {Object.entries(s.routes).map(([rid, route]) => (
                <button
                  key={rid}
                  type="button"
                  className={styles.wf}
                  aria-current={selectedId === `route:${rid}`}
                  onClick={() => setSelectedId(`route:${rid}`)}
                >
                  <span className={styles.ico}>
                    <ProviderMark id={rid} size={13} />
                  </span>
                  <span className={styles.wfName}>{ROUTES[rid]?.label ?? rid}</span>
                  <span className={styles.wfCount}>
                    {route.running ? t('playbooks.on') : t('playbooks.off')}
                  </span>
                </button>
              ))}
            </div>
            <div className={styles.group}>
              <div className={styles.groupTitle}>{t('playbooks.groupAccounts')}</div>
              {ACCOUNT_PROVIDERS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={styles.wf}
                  aria-current={selectedId === `accounts:${id}`}
                  onClick={() => setSelectedId(`accounts:${id}`)}
                >
                  <span className={styles.ico}>
                    <ProviderMark id={id} size={13} />
                  </span>
                  <span className={styles.wfName}>{providerLabel(s, id)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.sideFooter}>
            <div className={styles.footerRow}>
              <span className={styles.footerLabel}>{t('playbooks.fileLabel')}</span>
              <button
                type="button"
                className={styles.toolbarButton}
                aria-pressed={yamlOpen}
                onClick={() => setYamlOpen(!yamlOpen)}
              >
                coding-opus-playbooks.yaml
              </button>
            </div>
            <p className={styles.fileNote} title={file.path}>
              {file.custom ? t('playbooks.sourceCustom') : t('playbooks.sourceBundled')}
            </p>
            <button
              type="button"
              className={styles.button}
              aria-pressed={selectedId === MODEL_UPDATES_ID}
              onClick={() => setSelectedId(MODEL_UPDATES_ID)}
            >
              <RefreshCw size={12} />
              {t('playbooks.modelsUpdateButton')}
            </button>
            <button
              type="button"
              className={styles.button}
              disabled={!file.backupText || saving}
              onClick={restoreBackup}
            >
              {t('playbooks.restoreBackup')}
            </button>
            <div className={styles.saveRow} role="status">
              <span className={styles.fileNote}>
                {saving
                  ? t('playbooks.saving')
                  : edited && blocked
                    ? t('playbooks.saveBlocked')
                    : edited && failedRevision === revision
                      ? t('playbooks.saveFailed')
                      : edited
                        ? t('playbooks.autoSavePending')
                        : t('playbooks.autoSaved')}
              </span>
              {edited && (blocked || failedRevision === revision) ? (
                <>
                  {failedRevision === revision && !blocked ? (
                    <button type="button" className={styles.button} onClick={() => void save()}>
                      {t('playbooks.retry')}
                    </button>
                  ) : null}
                  <button type="button" className={styles.button} onClick={onDiscard}>
                    {t('playbooks.discard')}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </nav>

        <section className={styles.stage}>
          {wf.kind === 'playbook' && docView ? (
            <NodeCanvas
              key={wf.id}
              wf={wf}
              view={docView}
              pulse={pulse}
              reserved={yamlOpen}
              onStructure={() => touch()}
            />
          ) : (
            <FlowCanvas
              graph={graph}
              fitKey={s.wf}
              pulse={pulse}
              reserved={yamlOpen}
              onMove={(id, position) => {
                wf.positions[id] = position
                bump()
              }}
            />
          )}
          {problems.length ? (
            <button
              type="button"
              className={styles.problemBanner}
              onClick={() => setSelectedId(problems[0].node)}
            >
              {t('playbooks.problemBanner', { count: problems.length })}
            </button>
          ) : null}
          <div className={styles.scenarioBar}>
            <label className={styles.scenarioItem}>
              <span>{t('playbooks.scenarioTask')}</span>
              <Select
                className={styles.scenarioSelect}
                value={s.task}
                ariaLabel={t('playbooks.scenarioTask')}
                // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: Object.keys of a literal record returns exactly its own keys.
                options={(Object.keys(TASKS) as TaskId[]).map((task) => ({
                  value: task,
                  label: taskLabel(t, task)
                }))}
                onChange={(value) =>
                  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the Select only offers options built from this union.
                  setScenario('task', value as TaskId)
                }
              />
            </label>
            <span className={styles.divider} />
            <label className={styles.scenarioItem}>
              <span>{t('playbooks.scenarioChecks')}</span>
              <Select
                className={styles.scenarioSelect}
                value={s.checks}
                ariaLabel={t('playbooks.scenarioChecks')}
                options={CHECKS.map((check) => ({ value: check, label: t(CHECK_KEYS[check]) }))}
                onChange={(value) =>
                  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the Select only offers options built from this union.
                  setScenario('checks', value as PlaybooksState['checks'])
                }
              />
            </label>
            <span className={styles.divider} />
            <label className={styles.scenarioItem}>
              <span>{t('playbooks.scenarioBudget')}</span>
              <Select
                className={styles.scenarioSelect}
                value={s.budget}
                ariaLabel={t('playbooks.scenarioBudget')}
                options={BUDGETS.map((budget) => ({
                  value: budget,
                  label: t(BUDGET_KEYS[budget])
                }))}
                onChange={(value) =>
                  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the Select only offers options built from this union.
                  setScenario('budget', value as PlaybooksState['budget'])
                }
              />
            </label>
            <span className={styles.divider} />
            <label className={styles.scenarioItem}>
              <span>{t('playbooks.scenarioSpent')}</span>
              <Select
                className={styles.scenarioSelect}
                value={String(s.spent)}
                ariaLabel={t('playbooks.scenarioSpent')}
                options={SPENT_STEPS.map((amount) => ({
                  value: String(amount),
                  label: formatUsd(amount)
                }))}
                onChange={(value) => setScenario('spent', Number(value))}
              />
            </label>
            {allLow ? (
              <>
                <span className={styles.divider} />
                <label className={styles.scenarioItem}>
                  <span>{t('playbooks.scenarioAllLow')}</span>
                  <Select
                    className={styles.scenarioSelect}
                    value={s.quota.onBothCritical}
                    ariaLabel={t('playbooks.scenarioAllLow')}
                    options={ON_BOTH_CRITICAL.map((value) => ({
                      value,
                      label: t(BOTH_KEYS[value])
                    }))}
                    onChange={(value) => {
                      s.quota.onBothCritical = value
                      touch(true)
                    }}
                  />
                </label>
              </>
            ) : null}
          </div>
          {yamlOpen ? (
            <div className={styles.drawer}>
              <header>
                <b>coding-opus-playbooks.yaml</b>
                <span>{t('playbooks.drawerHint')}</span>
                <span className={styles.spacer} />
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => {
                    void navigator.clipboard?.writeText(toYaml(s)).then(() => setCopied(true))
                  }}
                >
                  {copied ? t('playbooks.copied') : t('playbooks.copy')}
                </button>
              </header>
              <pre>{toYaml(s)}</pre>
            </div>
          ) : null}
          {panelOpen ? (
            <Inspector
              graph={graph}
              onDelete={removeSelection}
              onClose={() => {
                setSelectedId(null)
                setInfo(false)
              }}
            />
          ) : null}
        </section>
      </div>
    </PlaybooksContext.Provider>
  )
}
