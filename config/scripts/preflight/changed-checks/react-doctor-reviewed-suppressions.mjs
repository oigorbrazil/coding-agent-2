// React Doctor diagnostics reviewed per file: rule id -> files where that rule is accepted.
export const SUPPRESSED_REACT_DOCTOR_DIAGNOSTICS = new Map([
  [
    'react-doctor(no-adjust-state-on-prop-change)',
    new Set([
      'src/renderer/src/components/task-page/github/use-task-page-github-issue-draft.ts',
      'src/renderer/src/components/task-page/jira/use-task-page-jira-creation-state.ts',
      // Ported playbooks editor: closing the listbox when it becomes disabled is the intended reset.
      'src/renderer/src/components/settings/coding-opus/playbooks/Dropdown.tsx'
    ])
  ],
  [
    // Ported playbooks editor: rule and condition cards hold no per-row state and rebuild from YAML on each edit.
    'react-doctor(no-array-index-as-key)',
    new Set([
      'src/renderer/src/components/settings/coding-opus/playbooks/Inspector.tsx',
      'src/renderer/src/components/settings/coding-opus/playbooks/PhaseEditors.tsx',
      'src/renderer/src/components/settings/coding-opus/playbooks/RoutingEditors.tsx'
    ])
  ],
  [
    'react-doctor(no-derived-state-effect)',
    new Set([
      // The open-cycle reset effect predates this entry; it surfaced when its body changed.
      'src/renderer/src/components/right-sidebar/source-control/ai/useSourceControlAgentActionDialog.ts'
    ])
  ],
  [
    // Existing timer effects clean variable handle sets through addTimer; rule expects one named handle and falsely reports both.
    // Exemption is per-file, covering those two effects; this file has no other timer effects.
    'react-doctor(effect-needs-cleanup)',
    new Set(['mobile/src/session/use-mobile-session-startup.ts'])
  ]
])
