import { PanelRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useShortcutLabel } from '@/hooks/useShortcutLabel'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'

/** Collapse/expand the right sidebar from the top bar's right corner, next to the window controls. */
export function TopBarRightSidebarToggle(): React.JSX.Element {
  const t = useTranslate()
  const toggleRightSidebar = useAppStore((s) => s.toggleRightSidebar)
  const rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen)
  const shortcut = useShortcutLabel('sidebar.right.toggle')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggleRightSidebar}
          aria-label={t('auto.App.9e0b441a91', 'Toggle right sidebar')}
          aria-pressed={rightSidebarOpen}
          className={cn(
            'ml-1 flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            rightSidebarOpen && 'text-foreground'
          )}
        >
          <PanelRight className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {t('auto.App.c184e056de', 'Toggle right sidebar ({{value0}})', { value0: shortcut })}
      </TooltipContent>
    </Tooltip>
  )
}
