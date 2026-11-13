import { Check } from 'lucide-react'
import type { GlobalSettings } from '../../../../../shared/global-settings-types'
import { UI_LANGUAGE_NATIVE_NAMES } from '../../../../../shared/ui-language'
import { UI_LANGUAGE_CHOICES } from '@/i18n/supported-languages'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/utils'

type LanguagePaneProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

export function LanguagePane({ settings, updateSettings }: LanguagePaneProps): React.JSX.Element {
  const t = useTranslate()
  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {UI_LANGUAGE_CHOICES.map((choice) => {
        const selected = settings.uiLanguage === choice.value
        // Each language shows in its own script plus the current UI language, so anyone can find theirs.
        const localized = t(choice.labelKey, UI_LANGUAGE_NATIVE_NAMES[choice.value])
        const native = UI_LANGUAGE_NATIVE_NAMES[choice.value]
        return (
          <button
            key={choice.value}
            type="button"
            aria-pressed={selected}
            onClick={() => updateSettings({ uiLanguage: choice.value })}
            className={cn(
              'flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent',
              selected && 'bg-accent'
            )}
          >
            <span className="flex-1 text-sm text-foreground">{native}</span>
            {localized !== native ? (
              <span className="text-xs text-muted-foreground">{localized}</span>
            ) : null}
            <Check className={cn('size-4 text-foreground', !selected && 'invisible')} />
          </button>
        )
      })}
    </div>
  )
}
