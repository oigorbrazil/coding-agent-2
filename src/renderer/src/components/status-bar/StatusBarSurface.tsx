import { RefreshCw } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { lazyWithRetry } from '@/lib/lazy-with-retry'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import { UsageRosterPanel } from './UsageRosterPanel'
import {
  STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS,
  shouldOpenStatusBarContextMenu
} from './status-bar-context-menu-policy'
import { StatusBarUsageEmptyCta } from './StatusBarUsageEmptyCta'
import { StatusBarUsageChangeNotices } from './StatusBarUsageChangeNotices'
import { UpdateStatusSegment } from './UpdateStatusSegment'
import { SkillUpdateStatusSegment } from './SkillUpdateStatusSegment'
import { NativeChatResumeStatusSegment } from './NativeChatResumeStatusSegment'
import { CaffeinateStatusSegment } from './CaffeinateStatusSegment'
import { PluginsStatusSegment } from './PluginsStatusSegment'
import { PluginStatusBarItems } from './PluginStatusBarItems'
import { RemoteServerUpdateStatusSegment } from './RemoteServerUpdateStatusSegment'
import { ClaudeSwitcherMenu } from './ClaudeSwitcherMenu'
import { CodexSwitcherMenu } from './CodexSwitcherMenu'
import { ProviderDetailsMenu } from './ProviderDetailsMenu'
import { AntigravityUsageMenu } from './AntigravityUsageMenu'
import { CLOSE_ALL_CONTEXT_MENUS_EVENT } from '@/lib/close-all-context-menus'
import { ProviderSegment, UsageOverflowChip, getUsageTone } from './StatusBarProviderSegment'
import {
  UsageUnitLabel,
  getUsageUnitLabelState,
  usageChipShowsPercentage
} from './usage-unit-label'
import { useStatusBarController } from './use-status-bar-controller'
import { isOwnerNotSetUpPlaceholder } from './owner-usage-rate-limits'
import { StatusBarVisibilityMenu } from './StatusBarVisibilityMenu'
import { TopBarRightSidebarToggle } from './TopBarRightSidebarToggle'
import { isPairedWebClientWindow } from '@/lib/desktop-window-chrome'

const PetStatusSegment = lazyWithRetry(() =>
  import('./PetStatusSegment').then((module) => ({ default: module.PetStatusSegment }))
)
const ResourceUsageStatusSegment = lazyWithRetry(() =>
  import('./ResourceUsageStatusSegment').then((module) => ({
    default: module.ResourceUsageStatusSegment
  }))
)
const PortsStatusSegment = lazyWithRetry(() =>
  import('./PortsStatusSegment').then((module) => ({ default: module.PortsStatusSegment }))
)
const SshStatusSegment = lazyWithRetry(() =>
  import('./SshStatusSegment').then((module) => ({ default: module.SshStatusSegment }))
)

export type StatusBarProps = {
  floatingTerminalOpen: boolean
}

export function StatusBarSurface({
  floatingTerminalOpen
}: StatusBarProps): React.JSX.Element | null {
  const t = useTranslate()
  // Memoized labels still need to follow language changes.
  useTranslation()
  const controller = useStatusBarController(floatingTerminalOpen)
  if (!controller) {
    return null
  }
  const {
    antigravityAccounts,
    anyFetching,
    anyVisible,
    barRef,
    canSignInFromUsageRow,
    collapseUsage,
    collapsedUsageProviders,
    compact,
    handleManageAccounts,
    handleOpenProviderAccounts,
    handleRefresh,
    handleUsageDetails,
    handleUsageMenuOpenChange,
    hasVisibleUsageMeters,
    isEmptyUsageState,
    isRefreshing,
    overflowing,
    petEnabled,
    remoteOwner,
    rosterProviders,
    segmentsIconOnly,
    segmentsRef,
    setMenuOpen,
    setMenuPoint,
    setStatusBarUsageMode,
    showEmptyUsageCta,
    showPorts,
    showResourceUsage,
    showSsh,
    statusBarUsageMode,
    usageMenuFocusHandoff,
    usageMenuOpen,
    usagePercentageDisplay,
    usageRef,
    usageTightestOnly
  } = controller
  const usageMode = usageTightestOnly ? 'compact' : statusBarUsageMode
  const unitLabelState = getUsageUnitLabelState(
    rosterProviders,
    collapsedUsageProviders,
    usageMode,
    t
  )

  return (
    <div
      ref={barRef}
      data-orca-status-bar=""
      // Why: one line at any width — density steps down first. overflow-clip (not hidden) so focus can't scroll the bar; the clip margin spares focus rings and badge dots.
      // Coding Agent 2 pins the bar to the top edge (order-first in the column layout), clear of the window controls.
      className="order-first flex items-center h-6 min-h-6 [-webkit-app-region:drag] [&_*]:[-webkit-app-region:no-drag] pl-3 pr-[calc(var(--window-controls-width,0px)+0.75rem)] gap-4 overflow-clip [overflow-clip-margin:3px] whitespace-nowrap text-xs select-none shrink-0 relative"
      onContextMenuCapture={(event) => {
        if (!shouldOpenStatusBarContextMenu(event.target)) {
          return
        }
        // Close peer menus and anchor at the cursor so repeated right-clicks reposition the menu.
        event.preventDefault()
        window.dispatchEvent(new Event(CLOSE_ALL_CONTEXT_MENUS_EVENT))
        const bounds = event.currentTarget.getBoundingClientRect()
        setMenuPoint({ x: event.clientX - bounds.left, y: event.clientY - bounds.top })
        setMenuOpen(true)
      }}
    >
      {/* Why: usage gives way first — what it drops stays one click away in its popover. */}
      <div
        className="status-bar-usage-cluster flex min-w-0 flex-1 items-center overflow-clip [overflow-clip-margin:3px]"
        data-overflowing={overflowing}
      >
        <div ref={usageRef} className="flex shrink-0 items-center gap-3">
          {isEmptyUsageState ? (
            showEmptyUsageCta ? (
              <StatusBarUsageEmptyCta remoteOwner={remoteOwner} />
            ) : null
          ) : hasVisibleUsageMeters ? (
            <StatusBarUsageChangeNotices hasVisibleUsageMeters={hasVisibleUsageMeters}>
              <DropdownMenu
                open={usageMenuOpen}
                onOpenChange={handleUsageMenuOpenChange}
                modal={false}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-3 rounded px-1 py-0.5 hover:bg-accent/70"
                    aria-label={t('auto.components.status.bar.UsageRosterPanel.title', 'Usage')}
                  >
                    {unitLabelState !== 'absent' ? (
                      <UsageUnitLabel
                        collapsed={unitLabelState === 'collapsed'}
                        display={usagePercentageDisplay}
                      />
                    ) : null}
                    {rosterProviders.map((p) => (
                      // Why: collapsed chips leave the row but stay measurable, so the density hook can bring them back.
                      <span
                        key={p.provider}
                        data-usage-chip={p.provider}
                        data-usage-urgent={getUsageTone(p) === 'urgent'}
                        data-usage-percentage={usageChipShowsPercentage(p, usageMode, t)}
                        data-usage-collapsed={collapsedUsageProviders.includes(p.provider)}
                        aria-hidden={collapsedUsageProviders.includes(p.provider)}
                        className="inline-flex data-[usage-collapsed=true]:invisible data-[usage-collapsed=true]:absolute"
                      >
                        <ProviderSegment
                          p={p}
                          compact={compact}
                          display={usagePercentageDisplay}
                          mode={usageMode}
                        />
                      </span>
                    ))}
                    {collapseUsage ? (
                      <UsageOverflowChip
                        providerCount={rosterProviders.length}
                        hidden={rosterProviders.filter((p) =>
                          collapsedUsageProviders.includes(p.provider)
                        )}
                        display={usagePercentageDisplay}
                      />
                    ) : null}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  {...STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS}
                  side="top"
                  align="start"
                  sideOffset={8}
                  // Reserve footer height so the popover and drill-in submenus stay above the status bar.
                  collisionPadding={{ top: 8, bottom: 32, left: 8, right: 8 }}
                  className="w-[360px] p-0"
                  onPointerDownOutside={usageMenuFocusHandoff.onPointerDownOutside}
                  onCloseAutoFocus={usageMenuFocusHandoff.onCloseAutoFocus}
                >
                  <UsageRosterPanel
                    providers={rosterProviders}
                    display={usagePercentageDisplay}
                    statusBarUsageMode={statusBarUsageMode}
                    onStatusBarUsageModeChange={setStatusBarUsageMode}
                    isRefreshing={isRefreshing || anyFetching}
                    onRefresh={handleRefresh}
                    onOpenProvider={handleOpenProviderAccounts}
                    onSignIn={handleOpenProviderAccounts}
                    canSignIn={canSignInFromUsageRow}
                    onManageAccounts={handleManageAccounts}
                    onUsageDetails={handleUsageDetails}
                    renderRow={(p, rowNode) => {
                      // Why: a placeholder has nothing to drill into; its row opens the host's accounts.
                      if (isOwnerNotSetUpPlaceholder(p)) {
                        return null
                      }
                      // Claude/Codex detail panels also expose account switching and runtime controls.
                      if (p.provider === 'claude') {
                        return (
                          <ClaudeSwitcherMenu
                            claude={p}
                            compact={compact}
                            iconOnly={false}
                            asSubmenu
                            triggerContent={rowNode}
                          />
                        )
                      }
                      if (p.provider === 'antigravity') {
                        return (
                          <AntigravityUsageMenu
                            antigravity={p}
                            accounts={antigravityAccounts}
                            compact={compact}
                            triggerContent={rowNode}
                            onManageAccounts={() => handleOpenProviderAccounts('antigravity')}
                          />
                        )
                      }
                      if (p.provider === 'codex') {
                        return (
                          <CodexSwitcherMenu
                            codex={p}
                            compact={compact}
                            iconOnly={false}
                            asSubmenu
                            triggerContent={rowNode}
                          />
                        )
                      }
                      return (
                        <ProviderDetailsMenu
                          provider={p}
                          compact={compact}
                          iconOnly={false}
                          asSubmenu
                          triggerContent={rowNode}
                          ariaLabel={t(
                            'auto.components.status.bar.UsageRosterPanel.openDetails',
                            'Open usage details'
                          )}
                        />
                      )
                    }}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </StatusBarUsageChangeNotices>
          ) : null}
          {anyVisible && !isEmptyUsageState && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  aria-label={t(
                    'auto.components.status.bar.StatusBar.3325d996cb',
                    'Refresh rate limits'
                  )}
                >
                  <RefreshCw
                    size={11}
                    className={isRefreshing || anyFetching ? 'animate-spin' : ''}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                {t('auto.components.status.bar.StatusBar.c8857b40f7', 'Refresh usage data')}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Why: attention segments never clip; below the tightest density they scroll rather than vanish. */}
      <div
        className="min-w-0 data-[overflowing=true]:overflow-x-auto data-[overflowing=true]:scrollbar-none"
        data-overflowing={overflowing}
      >
        <div ref={segmentsRef} className="flex w-max items-center gap-3">
          {!isPairedWebClientWindow() ? (
            <>
              <PluginsStatusSegment />
              <PluginStatusBarItems iconOnly={segmentsIconOnly} />
              <CaffeinateStatusSegment iconOnly={segmentsIconOnly} />
            </>
          ) : null}
          <RemoteServerUpdateStatusSegment iconOnly={segmentsIconOnly} />
          <SkillUpdateStatusSegment iconOnly={segmentsIconOnly} />
          <NativeChatResumeStatusSegment iconOnly={segmentsIconOnly} />
          <UpdateStatusSegment compact={compact} iconOnly={segmentsIconOnly} />
          <React.Suspense fallback={null}>
            {petEnabled ? <PetStatusSegment /> : null}
            {showResourceUsage ? (
              <ResourceUsageStatusSegment compact={compact} iconOnly={segmentsIconOnly} />
            ) : null}
            {showPorts ? (
              <PortsStatusSegment compact={compact} iconOnly={segmentsIconOnly} />
            ) : null}
            {showSsh ? <SshStatusSegment compact={compact} iconOnly={segmentsIconOnly} /> : null}
          </React.Suspense>
          <TopBarRightSidebarToggle />
        </div>
      </div>

      <StatusBarVisibilityMenu controller={controller} />
    </div>
  )
}
