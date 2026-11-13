import * as React from 'react'
import * as SwitchPrimitive from 'radix-ui/switch'

import { cn } from '@/lib/utils'

const trackClassName =
  'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent p-0.5 transition-colors data-[state=checked]:bg-switch-on data-[state=unchecked]:bg-switch-track'
const thumbClassName =
  'pointer-events-none block h-3.5 w-5 translate-x-0 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.18),0_0_0_0.5px_rgb(0_0_0/0.06)] transition-transform duration-200 ease-out data-[state=checked]:translate-x-2.5'
const compactTrackClassName = 'h-3.5 w-6 border-0 p-0.5'
const compactThumbClassName = 'h-2.5 w-3.5 data-[state=checked]:translate-x-1.5'

type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> & {
  thumbClassName?: string
}

function Switch({ className, thumbClassName: thumbClasses, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        trackClassName,
        'cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(thumbClassName, thumbClasses)}
      />
    </SwitchPrimitive.Root>
  )
}

type SwitchIndicatorProps = Omit<React.ComponentProps<'span'>, 'children'> & {
  checked: boolean
  size?: 'default' | 'compact'
  thumbClassName?: string
}

function SwitchIndicator({
  checked,
  className,
  size = 'default',
  thumbClassName: thumbClasses,
  ...props
}: SwitchIndicatorProps) {
  const state = checked ? 'checked' : 'unchecked'
  return (
    <span
      aria-hidden="true"
      data-slot="switch-indicator"
      data-state={state}
      className={cn(trackClassName, size === 'compact' && compactTrackClassName, className)}
      {...props}
    >
      <span
        data-slot="switch-thumb"
        data-state={state}
        className={cn(thumbClassName, size === 'compact' && compactThumbClassName, thumbClasses)}
      />
    </span>
  )
}

export { Switch, SwitchIndicator }
