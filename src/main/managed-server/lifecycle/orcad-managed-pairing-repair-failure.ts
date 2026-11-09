export const ORCAD_PAIRING_REPAIR_FAILED_CODE = 'orcad_pairing_repair_failed'

export class OrcadManagedPairingRepairFailedError extends Error {
  readonly code = ORCAD_PAIRING_REPAIR_FAILED_CODE
  constructor(reason: string) {
    super(
      `${ORCAD_PAIRING_REPAIR_FAILED_CODE}: the Coding Agent 2 server on this host no longer accepts this ` +
        `computer, and Coding Agent 2 couldn't pair with it again over SSH: ${reason}. Nothing on the host ` +
        `was stopped; its terminals can't be verified until Coding Agent 2 pairs again. Connect again to retry.`
    )
    this.name = 'OrcadManagedPairingRepairFailedError'
  }
}
