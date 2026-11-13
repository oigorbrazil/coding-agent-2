/** Leads PATH with the managed WSL CLI after startup files ran; an unusable CLI only warns. */
export const WSL_MANAGED_CLI_PATH_RESTORE = `if [ -n "\${CODING_AGENT_WSL_CLI_DIR-\${ORCA_WSL_CLI_DIR:-}}" ]; then
  if [ -x "\${CODING_AGENT_WSL_CLI_DIR-$ORCA_WSL_CLI_DIR}/\${CODING_AGENT_CLI_COMMAND-\${ORCA_CLI_COMMAND:-}}" ]; then
    export PATH="\${CODING_AGENT_WSL_CLI_DIR-$ORCA_WSL_CLI_DIR}\${PATH:+:$PATH}"
  else
    printf 'Coding Agent 2 CLI unavailable: cannot run %s. Check WSL Windows-drive mount options.\\n' "\${CODING_AGENT_WSL_CLI_DIR-$ORCA_WSL_CLI_DIR}/\${CODING_AGENT_CLI_COMMAND-\${ORCA_CLI_COMMAND:-}}" >&2
  fi
fi`
