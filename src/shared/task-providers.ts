export type TaskProvider = 'github' | 'gitlab' | 'linear' | 'jira'

export const TASK_PROVIDERS: readonly TaskProvider[] = ['github', 'gitlab', 'linear', 'jira']

const TASK_PROVIDER_SET = new Set<TaskProvider>(TASK_PROVIDERS)

/** Sources Tasks offers: Coding Agent 2 integrates GitHub only; workspaces linked to other trackers still resolve. */
export const SELECTABLE_TASK_PROVIDERS: readonly TaskProvider[] = ['github']

function isSelectableTaskProvider(value: unknown): value is TaskProvider {
  return isTaskProvider(value) && SELECTABLE_TASK_PROVIDERS.includes(value)
}

export function isTaskProvider(value: unknown): value is TaskProvider {
  return TASK_PROVIDER_SET.has(value as TaskProvider)
}

export function normalizeTaskProviderSettings(value: {
  visibleTaskProviders: unknown
  defaultTaskSource: unknown
}): { visibleTaskProviders: TaskProvider[]; defaultTaskSource: TaskProvider } {
  const visibleTaskProviders = normalizeVisibleTaskProviders(value.visibleTaskProviders)
  const defaultTaskSource = isSelectableTaskProvider(value.defaultTaskSource)
    ? value.defaultTaskSource
    : resolveVisibleTaskProvider('github', visibleTaskProviders)

  if (visibleTaskProviders.includes(defaultTaskSource)) {
    return { visibleTaskProviders, defaultTaskSource }
  }

  // Repair older/drifted profiles whose saved default disappeared from the visible list.
  return {
    defaultTaskSource,
    visibleTaskProviders: SELECTABLE_TASK_PROVIDERS.filter(
      (provider) => provider === defaultTaskSource || visibleTaskProviders.includes(provider)
    )
  }
}

export function normalizeVisibleTaskProviders(value: unknown): TaskProvider[] {
  if (!Array.isArray(value)) {
    return [...SELECTABLE_TASK_PROVIDERS]
  }

  const normalized: TaskProvider[] = []
  for (const provider of value) {
    if (!isSelectableTaskProvider(provider)) {
      continue
    }
    if (!normalized.includes(provider)) {
      normalized.push(provider)
    }
  }

  // Keep a selectable source after hydration or manual settings edits.
  return normalized.length > 0 ? normalized : [...SELECTABLE_TASK_PROVIDERS]
}

export type TaskProviderAvailability = {
  gitlabInstalled: boolean
  linearConnected: boolean
}

export function filterAvailableTaskProviders(
  visibleProviders: readonly TaskProvider[],
  availability: TaskProviderAvailability
): TaskProvider[] {
  const available = visibleProviders.filter(
    (provider) =>
      isSelectableTaskProvider(provider) && isTaskProviderAvailable(provider, availability)
  )

  return available.length > 0 ? available : ['github']
}

export function restoreAvailableDefaultTaskProvider(
  visibleProviders: readonly TaskProvider[],
  availability: TaskProviderAvailability,
  preferredProvider: unknown
): TaskProvider[] {
  const available = filterAvailableTaskProviders(visibleProviders, availability)

  // Retain access to a saved default even when other providers become available.
  if (
    isSelectableTaskProvider(preferredProvider) &&
    isTaskProviderAvailable(preferredProvider, availability) &&
    !available.includes(preferredProvider)
  ) {
    return SELECTABLE_TASK_PROVIDERS.filter(
      (provider) => provider === preferredProvider || available.includes(provider)
    )
  }

  return available
}

function isTaskProviderAvailable(
  provider: TaskProvider,
  availability: TaskProviderAvailability
): boolean {
  if (provider === 'github') {
    return true
  }
  if (provider === 'gitlab') {
    return availability.gitlabInstalled
  }
  // Disconnected Jira must remain visible as its own first-time setup entry point.
  if (provider === 'jira') {
    return true
  }
  return availability.linearConnected
}

export function resolveVisibleTaskProvider(
  preferred: TaskProvider | null | undefined,
  visibleProviders: readonly TaskProvider[]
): TaskProvider {
  if (preferred && visibleProviders.includes(preferred)) {
    return preferred
  }
  return visibleProviders[0] ?? 'github'
}
