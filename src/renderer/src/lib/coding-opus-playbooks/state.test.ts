import { describe, expect, it } from 'vitest'
import { createPlaybooksState, phaseBase, type Phase } from './state'

const TEXT = `version: 1
providers: [claude, codex]
tiers:
  strong:
    claude: { model: opus }
    codex: { model: gpt-6.1-sol, effort: high }
playbooks:
  direct:
    name: Direct
    phases:
      - id: plan
        role: planner
        who: lead
        tier: strong
`

describe('phaseBase for a lead phase', () => {
  const s = createPlaybooksState(TEXT)

  it('uses the first provider when the phase pins none', () => {
    const p: Phase = { id: 'plan', who: 'lead', tier: 'strong' }
    expect(phaseBase(s, p).provider).toBe('claude')
  })

  it('honors the provider the lead phase pins', () => {
    const p: Phase = { id: 'plan', who: 'lead', tier: 'strong', provider: 'codex' }
    expect(phaseBase(s, p).provider).toBe('codex')
  })

  it('drops a model that belongs to another provider', () => {
    const p: Phase = { id: 'plan', who: 'lead', tier: 'strong', provider: 'codex', model: 'opus' }
    expect(phaseBase(s, p).model).toBeNull()
  })
})
