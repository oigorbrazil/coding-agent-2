/** Holds a busy flag while `task` runs. Lives outside components: React Compiler skips try/finally. */
export async function runWithBusyFlag<T>(
  setBusy: (busy: boolean) => void,
  task: () => Promise<T>
): Promise<T> {
  setBusy(true)
  try {
    return await task()
  } finally {
    setBusy(false)
  }
}
