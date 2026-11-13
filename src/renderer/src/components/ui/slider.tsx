import * as React from 'react'
import * as SliderPrimitive from 'radix-ui/slider'

import { cn } from '@/lib/utils'

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  thumbLabels?: readonly string[]
  thumbValueLabels?: readonly string[]
}

function Slider({
  className,
  value,
  defaultValue,
  thumbLabels,
  thumbValueLabels,
  ...props
}: SliderProps): React.ReactElement {
  const thumbCount = Math.max((value ?? defaultValue)?.length ?? 1, 1)

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        'relative flex w-full touch-none select-none items-center',
        'data-[disabled]:opacity-50',
        className
      )}
      value={value}
      defaultValue={defaultValue}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-foreground/10"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute h-full bg-control-fill"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }, (_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          data-slot="slider-thumb"
          aria-label={thumbLabels?.[index]}
          aria-valuetext={thumbValueLabels?.[index]}
          className={cn(
            'block h-4 w-6 rounded-full bg-white shadow-[0_1px_4px_rgb(0_0_0/0.2),0_0_0_0.5px_rgb(0_0_0/0.06)]',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:pointer-events-none disabled:opacity-50'
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
