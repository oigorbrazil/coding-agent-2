# Notice

Coding Agent 2 is a fork of [Orca](https://github.com/stablyai/orca), Copyright (c) 2026 Lovecast
Inc., used under the MIT License. The original license text is kept unchanged in [`LICENSE`](LICENSE)
and must ship with every copy or substantial portion of this software.

"Orca" and its logo belong to their owners and are not licensed with the code, so this fork ships
under its own name, application id (`com.codingagent.desktop2`), protocol (`codingagent2://`) and
icons.

Changes in this fork:

- Product renamed to Coding Agent 2, with its own data folders (`%APPDATA%\Coding Agent 2`,
  `~/.coding-agent-2`) so it never shares state with an installed Orca.
- Bundles the Coding Opus skill (`oigorbrazil/coding-opus`, `skills/coding`, version 30, commit
  `0253b4b`) in `resources/coding-opus/` and installs it for Claude Code and Codex.
- Adds the Playbooks and Second brain screens under Settings → Coding Opus.
