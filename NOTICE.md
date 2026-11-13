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
- Bundles the Coding Opus skill (`oigorbrazil/coding-opus`, `skills/coding`, version 32, commit
  `7daebda`) in `resources/coding-opus/` and installs it for Claude Code and Codex.
- Adds the Playbooks and Second brain screens under Settings → Coding Opus.
- Adopts a liquid glass visual identity whose palette and material values are adapted from
  [glisse](https://github.com/0kzh/glisse), Copyright (c) Kelvin Zhang, MIT License (see
  [`DESIGN.md`](DESIGN.md)). No glisse code is bundled.
- Bundles the Inter typeface (`src/renderer/src/assets/fonts/InterVariable.woff2`), Copyright (c) 2016
  The Inter Project Authors, under the SIL Open Font License 1.1 (`Inter-OFL.txt` beside it).
