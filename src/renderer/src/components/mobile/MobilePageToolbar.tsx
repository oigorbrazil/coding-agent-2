import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslate } from '@/i18n/use-translate'

type MobilePageToolbarProps = {
  onClose: () => void
}

export function MobilePageToolbar({ onClose }: MobilePageToolbarProps): React.JSX.Element {
  const t = useTranslate()

  return (
    <div className="mp-page-toolbar">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="mp-page-toolbar-close size-7 shrink-0 rounded-full"
            onClick={onClose}
            aria-label={t(
              'auto.components.mobile.MobilePageToolbar.9883b58693',
              'Close Coding Agent 2 Mobile'
            )}
          >
            <X className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {t('auto.components.mobile.MobilePageToolbar.ad2284a9e2', 'Close · Esc')}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
