# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

App de desktop em Electron + React (macOS, Windows, Linux). O app mobile complementar (`mobile/`, Expo/React Native) é uma superfície separada; sua plataforma de design ainda não foi decidida.

## Users

- **Agora:** o próprio dono do projeto, um desenvolvedor que roda vários agentes de código (Claude Code, Codex, Kimi, Antigravity e outros CLIs) em paralelo no dia a dia e trabalha principalmente em português.
- **Depois:** outros desenvolvedores, via releases públicas em `github.com/oigorbrazil/coding-agent-2`. Ainda não há usuários externos.

## Product Purpose

Orquestrar agentes de código: dividir uma tarefa grande entre workers, cada um no seu workspace (worktree git ou pasta), e trazer os resultados de volta para revisão. O sucesso é o dono delegar trabalho real a vários agentes ao mesmo tempo sem perder o controle do que cada um faz.

## Positioning

O Coding Agent 2 é um fork do Orca (stablyai/orca, MIT). O que o separa do Orca é a skill **Coding Opus** embutida: orquestração guiada por **playbooks** (unidades de trabalho reutilizáveis) com workers de vários CLIs. Decisões de produto que fortalecem esse fluxo têm prioridade sobre paridade com o Orca.

## Operating Context

- Terminais reais e Chat UI para cada agente, lado a lado em painéis divididos com diffs, navegador embutido e editor.
- Workspaces locais, em hosts SSH, em servidor remoto ou em VM na nuvem; app mobile para notificações e respostas longe da mesa.
- Revisão de diffs com notas por linha, integração com GitHub e Linear, CLI `coding-agent` (alias `orca`) que dá aos agentes as mesmas ações do app.
- Second brain em Obsidian consultado pela Coding Opus; editor de playbooks portado do Coding Agent 1; sincronização de múltiplas contas dos agentes.

## Capabilities and Constraints

- Herda os recursos do Orca; a troca interna do nome "orca" está em fases e ainda incompleta (links de Ajuda/feedback apontam para o Orca).
- Interface localizada em 11 idiomas.
- Primeiras classes de cidadania do repositório: multiplataforma, hosts remotos, mobile e workspaces que não são worktrees git (ver `AGENTS.md`).
- `LICENSE` e a menção ao Orca em `NOTICE.md` devem permanecer (exigência da licença MIT).

## Brand Commitments

- Nome: **Coding Agent 2**; comando de terminal `coding-agent`.
- Identidade visual: **liquid glass** adaptado do glisse (github.com/0kzh/glisse, MIT), escolhido pelo dono em 11/11/2026 para substituir o visual monocromático herdado do Orca. A autoridade visual é o `DESIGN.md`.

## Evidence on Hand

- Imagens e vídeos de recursos em `docs/assets/` (hero e `readme-features/`) vêm do Orca e mostram a UI dele.
- Não existem depoimentos, métricas, contagem de downloads nem estrelas próprios do Coding Agent 2. Os selos do README (estrelas, downloads, Discord, X) são do Orca e não devem ser apresentados como do Coding Agent 2.

## Product Principles

1. A orquestração com Coding Opus e playbooks é o centro do produto; o resto a sustenta.
2. O dono precisa ver e controlar o que cada agente faz: revisar antes de aceitar.
3. Funcionar em qualquer lugar: local, remoto, nuvem e mobile, em qualquer sistema operacional.
4. Feito primeiro para quem usa, pronto para ser distribuído depois, sem afirmações que o projeto ainda não pode sustentar.
