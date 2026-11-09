/** Google publishes no Windows Antigravity chat server Coding Agent 2 can run (#30817); relax this once one ships. */
export function structuredChatUnavailableOnPlatform(
  agent: string,
  platform: string | null | undefined
): boolean {
  return agent === 'antigravity' && platform === 'win32'
}
