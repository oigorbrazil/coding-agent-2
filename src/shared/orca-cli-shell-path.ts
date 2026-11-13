export const ORCA_CLI_POSIX_PATH_RESTORE = `if [ -n "\${CODING_AGENT_CLI_BIN_DIR-\${ORCA_CLI_BIN_DIR:-}}" ]; then
  case "\${PATH:-}" in
    "\${CODING_AGENT_CLI_BIN_DIR-$ORCA_CLI_BIN_DIR}"|"\${CODING_AGENT_CLI_BIN_DIR-$ORCA_CLI_BIN_DIR}":*) ;;
    *) export PATH="\${CODING_AGENT_CLI_BIN_DIR-$ORCA_CLI_BIN_DIR}\${PATH:+:$PATH}" ;;
  esac
fi`
