/** What the renderer sees of the Coding Agent 2 account; tokens never leave the main process. */
export type CodingAgentAccount = {
  name: string
  email: string
  /** A data: URL or an https URL; null shows the initial. */
  photo: string | null
  /** True once the email was confirmed with a code from the sign-in server. */
  emailVerified: boolean
  verifiedAt: number | null
  signedIn: boolean
  server: { url: string; configured: boolean }
}

export type CodingAgentAccountProfileUpdate = {
  name: string
  email: string
  photo: string | null
}

export type CodingAgentAccountResult =
  | { ok: true; account: CodingAgentAccount }
  | { ok: false; error: string; account: CodingAgentAccount }
