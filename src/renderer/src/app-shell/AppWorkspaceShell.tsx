import { Suspense, useRef } from 'react'
import { lazyWithRetry as lazy } from '@/lib/lazy-with-retry'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store'
import { pendingCreationOpensNativeChat } from '@/lib/workspace/creation/pending-worktree-creation'
import Sidebar from '../components/Sidebar'
import RightSidebar from '../components/right-sidebar'
import { RecoverableRenderErrorBoundary } from '../components/error-boundaries/RecoverableRenderErrorBoundary'
import { TerminalWorkbenchContainer } from '../components/TerminalWorkbenchContainer'
import type { VirtualizedScrollAnchor } from '../hooks/useVirtualizedScrollAnchor'
import { TitlebarLeftControls } from './TitlebarLeftControls'
import { TitlebarMainStrip } from './TitlebarMainStrip'
import type { AppChromeLayout } from './use-app-chrome-layout'

const Landing = lazy(() => import('../components/Landing'))
const WorktreeCreationPanel = lazy(
  () => import('../components/worktree-creation/WorktreeCreationPanel')
)
const PendingNativeChatCreation = lazy(
  () => import('../components/worktree-creation/PendingNativeChatCreation')
)
const TaskPage = lazy(() => import('../components/task-page/TaskPage'))
const AutomationsPage = lazy(() => import('../components/automations/AutomationsPage'))
const ActivityPrototypePage = lazy(() => import('../components/activity/ActivityPrototypePage'))
const Settings = lazy(() => import('../components/settings/Settings'))
const SkillsPage = lazy(() => import('../components/skills/SkillsPage'))
const ArtifactsPage = lazy(() => import('../components/artifacts/ArtifactsPage'))
const WorkspaceSpacePage = lazy(() => import('../components/workspace-space/WorkspaceSpacePage'))
const MobilePage = lazy(() => import('../components/mobile/MobilePage'))
const Terminal = lazy(() => import('../components/Terminal'))

type WorktreeSidebarScrollRefs = {
  scrollOffsetRef: React.MutableRefObject<number>
  scrollAnchorRef: React.MutableRefObject<VirtualizedScrollAnchor>
}

function WorktreeSidebar({
  layout,
  scrollRefs
}: {
  layout: AppChromeLayout
  scrollRefs: WorktreeSidebarScrollRefs
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <RecoverableRenderErrorBoundary
      boundaryId="sidebar.worktrees"
      surface="sidebar"
      resetKey={layout.activeView}
      title={t('auto.App.1468601e7b', 'The workspace list hit an error.')}
      description={
        layout.leftTitlebarChromeLayout.shouldMount
          ? t(
              'auto.App.bdc71dddc9',
              'The active workspace remains open. Retry the list or switch views.'
            )
          : t(
              'auto.App.cba0fafda5',
              'The active page remains open. Retry the list or switch views.'
            )
      }
    >
      <Sidebar
        worktreeScrollOffsetRef={scrollRefs.scrollOffsetRef}
        worktreeScrollAnchorRef={scrollRefs.scrollAnchorRef}
      />
    </RecoverableRenderErrorBoundary>
  )
}

// A chat-bound creation shows the chat itself, usable before its worktree exists.
function PendingCreationSurface(props: {
  creationId: string
  reserveCollapsedSidebarHeaderSpace: boolean
}): React.JSX.Element {
  const opensChat = useAppStore((s) => {
    const entry = s.pendingWorktreeCreations[props.creationId]
    return entry ? pendingCreationOpensNativeChat(entry) : false
  })
  return opensChat ? <PendingNativeChatCreation {...props} /> : <WorktreeCreationPanel {...props} />
}

function ActivePage({ layout }: { layout: AppChromeLayout }): React.JSX.Element {
  const { activeView, hasActiveWorktree, activePendingCreationId, creationLayoutActive } = layout
  return (
    <>
      {activeView === 'settings' ? <Settings /> : null}
      {activeView === 'skills' ? <SkillsPage /> : null}
      {activeView === 'artifacts' ? <ArtifactsPage /> : null}
      {activeView === 'tasks' ? <TaskPage /> : null}
      {activeView === 'automations' ? <AutomationsPage /> : null}
      {activeView === 'activity' ? <ActivityPrototypePage /> : null}
      {activeView === 'space' ? <WorkspaceSpacePage /> : null}
      {activeView === 'mobile' ? <MobilePage /> : null}
      {activeView === 'terminal' && creationLayoutActive && activePendingCreationId ? (
        <PendingCreationSurface
          creationId={activePendingCreationId}
          reserveCollapsedSidebarHeaderSpace={layout.leftTitlebarChromeLayout.isFloating}
        />
      ) : null}
      {activeView === 'terminal' && !hasActiveWorktree && !creationLayoutActive ? (
        <Landing />
      ) : null}
    </>
  )
}

export function AppWorkspaceShell({ layout }: { layout: AppChromeLayout }): React.JSX.Element {
  const t = useTranslate()
  const titlebarLeftControls = <TitlebarLeftControls layout={layout} />
  const titlebarMainStrip = <TitlebarMainStrip layout={layout} />
  // Keep scroll memory above sidebar view remounts to preserve list position.
  const scrollOffsetRef = useRef(0)
  const scrollAnchorRef = useRef<VirtualizedScrollAnchor>(null)
  const sidebarScrollRefs = { scrollOffsetRef, scrollAnchorRef }

  return (
    // Avoid active-worktree reset keys that remount whole surfaces during wake.
    <RecoverableRenderErrorBoundary
      boundaryId="app.workspace-shell"
      surface="workspace-shell"
      resetKey={layout.activeView}
      title={t('auto.App.df1d56bf87', 'The workspace shell hit an error.')}
      description={t(
        'auto.App.8504ddf267',
        'The app is still running. Retry the shell or use the menu to report the crash details.'
      )}
    >
      <div data-glass-stage="" className="flex flex-row flex-1 min-h-0 overflow-hidden">
        {/* Keep the non-workspace titlebar from spanning the right sidebar. */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          {/* Workspace tab groups reach the top; other pages retain the titlebar. */}
          {/* Settings brings its own sidebar header; the band would only add an empty stripe under the top bar. */}
          {!layout.leftTitlebarChromeLayout.shouldMount && layout.activeView !== 'settings' ? (
            // Coding Agent 2: the top bar above already draws the separator, so this band keeps its color without a border.
            <div className="titlebar" style={{ borderBottom: 'none' }}>
              <div className="flex items-center shrink-0 mr-2">{titlebarLeftControls}</div>
              {titlebarMainStrip}
            </div>
          ) : null}
          <div data-glass-row="" className="flex flex-row flex-1 min-h-0 overflow-hidden">
            {layout.showSidebar ? (
              layout.leftTitlebarChromeLayout.shouldMount ? (
                /* Remove the collapsed header from flex layout so panes reclaim the left edge. */
                <div
                  data-glass-panel={layout.sidebarOpen ? 'sidebar' : undefined}
                  className={`flex min-h-0 flex-col shrink-0${layout.sidebarOpen ? '' : ' relative w-0 overflow-visible'}`}
                >
                  <div
                    // The floating header covers the center border; restore the seam and size to its own controls.
                    className={`titlebar-left${
                      layout.leftTitlebarChromeLayout.isFloating
                        ? ' titlebar-left-floating absolute top-0 left-0 z-10 w-max border-r border-border'
                        : ''
                    }`}
                    style={{
                      // Why: custom sidebar appearances are scoped to the sidebar root; mirror those vars onto the header in the same left-column panel.
                      ...(layout.sidebarOpen ? layout.leftSidebarStyle : undefined),
                      // Why: size from the wrapper's live width so the header tracks in-flight drag resizes (persisted to Zustand only on mouseup).
                      width: layout.sidebarOpen ? '100%' : undefined
                    }}
                  >
                    {titlebarLeftControls}
                  </div>
                  {/* Keep a shrinkable flex viewport below the fixed header so the sidebar can scroll. */}
                  <div className="flex min-h-0 flex-1">
                    <WorktreeSidebar layout={layout} scrollRefs={sidebarScrollRefs} />
                  </div>
                </div>
              ) : (
                <WorktreeSidebar layout={layout} scrollRefs={sidebarScrollRefs} />
              )
            ) : null}
            <div
              data-glass-panel="main"
              className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden"
            >
              {/* Automations/artifacts own their headers; another titlebar would leave an empty stripe. */}
              {/* Coding Agent 2: without workspace tabs the strip would be an empty band under the top bar. */}
              {layout.stackedSidebarOpen &&
              (layout.workspaceChromeActive || layout.activeView === 'activity') &&
              layout.activeView !== 'automations' &&
              layout.activeView !== 'artifacts' ? (
                <div className="titlebar">{titlebarMainStrip}</div>
              ) : null}
              <div className="relative flex flex-1 min-w-0 min-h-0 overflow-hidden">
                <div className="flex flex-1 min-w-0 min-h-0 flex-col">
                  {layout.shouldMountTerminalWorkbench ? (
                    <TerminalWorkbenchContainer isVisible={layout.terminalWorkbenchVisible}>
                      <Suspense fallback={null}>
                        <RecoverableRenderErrorBoundary
                          boundaryId="terminal.workbench"
                          surface="terminal-workbench"
                          resetKey="terminal"
                          title={t('auto.App.5a9519aef0', 'The workspace workbench hit an error.')}
                          description={t(
                            'auto.App.98d4ea2823',
                            'Terminal, browser, or editor rendering failed in this workspace. Retry to remount it.'
                          )}
                        >
                          <Terminal />
                        </RecoverableRenderErrorBoundary>
                      </Suspense>
                    </TerminalWorkbenchContainer>
                  ) : null}
                  <Suspense fallback={null}>
                    <RecoverableRenderErrorBoundary
                      boundaryId={`page.${layout.activeView}`}
                      surface="page"
                      resetKey={layout.activeView}
                      title={t('auto.App.b7a714db1e', 'This page hit an error.')}
                      description={t(
                        'auto.App.03a14f6b5b',
                        'Retry the page or navigate to another Coding Agent 2 surface.'
                      )}
                    >
                      <ActivePage layout={layout} />
                    </RecoverableRenderErrorBoundary>
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Retain the shell for stable layout while heavy panels disconnect; tasks can unmount it. */}
        {layout.showRightSidebarControls ? (
          <RecoverableRenderErrorBoundary
            boundaryId="right-sidebar"
            surface="right-sidebar"
            resetKey={
              layout.rightSidebarTab === 'explorer'
                ? `${layout.rightSidebarTab}:${layout.rightSidebarExplorerView}`
                : layout.rightSidebarTab
            }
            title={t('auto.App.ed6b168d00', 'The right sidebar hit an error.')}
            description={t(
              'auto.App.8d1e160ed1',
              'Retry the sidebar or switch tabs to reload this surface.'
            )}
          >
            <RightSidebar />
          </RecoverableRenderErrorBoundary>
        ) : null}
      </div>
    </RecoverableRenderErrorBoundary>
  )
}
