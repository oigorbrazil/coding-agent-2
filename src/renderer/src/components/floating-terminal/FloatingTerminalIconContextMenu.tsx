import { useCallback, useRef, useState } from 'react'
import { EyeOff } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store'
import { useTranslate } from '@/i18n/use-translate'

type FloatingTerminalIconContextMenuProps = {
  children: React.ReactNode
  className?: string
}

export function FloatingTerminalIconContextMenu({
  children,
  className
}: FloatingTerminalIconContextMenuProps): React.JSX.Element {
  const t = useTranslate()
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [open, setOpen] = useState(false)
  const [menuPoint, setMenuPoint] = useState({ x: 0, y: 0 })
  const reopenFrameRef = useRef<number | null>(null)

  const setTriggerRef = useCallback((node: HTMLSpanElement | null): void => {
    if (node === null) {
      if (reopenFrameRef.current !== null) {
        window.cancelAnimationFrame(reopenFrameRef.current)
        reopenFrameRef.current = null
      }
    }
  }, [])

  return (
    <>
      <span
        ref={setTriggerRef}
        className={className}
        data-floating-terminal-toggle
        onContextMenuCapture={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setMenuPoint({ x: event.clientX, y: event.clientY })
          setOpen(false)
          if (reopenFrameRef.current !== null) {
            window.cancelAnimationFrame(reopenFrameRef.current)
          }
          reopenFrameRef.current = window.requestAnimationFrame(() => {
            reopenFrameRef.current = null
            setOpen(true)
          })
        }}
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        {children}
      </span>
      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            aria-hidden
            tabIndex={-1}
            className="pointer-events-none fixed size-px opacity-0"
            style={{ left: menuPoint.x, top: menuPoint.y }}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52" sideOffset={0} align="start">
          <DropdownMenuItem
            className="whitespace-nowrap"
            onSelect={() => {
              useAppStore.getState().recordFeatureInteraction('floating-workspace-hidden')
              void updateSettings({ floatingTerminalEnabled: false })
            }}
          >
            <EyeOff className="size-3.5" />
            {t(
              'auto.components.floating.terminal.FloatingTerminalIconContextMenu.8e7d775287',
              'Hide Floating Workspace'
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
