<<<<<<< HEAD
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HC1 is a calendar and scheduling productivity app. It is currently in early-stage development — no build system, language framework, or test infrastructure has been configured yet. The repository is tracked at `https://github.com/ChristianSAW/HC1`.

### Product Goals

- Help users manage their time through calendar views, event scheduling, and time-blocking
- Tech stack is not yet decided; evaluate options before initializing the project

## Repository Structure

- `HC1/` — main project repository directory
- `AGENT.md` — Machine-readable instructions for automated agents operating on this repo. Keep it short and stable.
- `.claude/settings.local.json` — Local Claude Code permission settings (allows `git config`, `find`, `git ls-tree` commands).

## Development Notes

- This project follows an agent-first development approach, designed for iterative development with AI agent assistance.
- When adding new infrastructure (build tools, test frameworks, linting), update this file accordingly.

## Workflow Preferences

- Confirm before pushing to remote branches
- Confirm before force-push or other destructive git operations
- Prefer editing existing files over creating new ones when possible

## Code Style

- Keep solutions minimal and focused; avoid over-engineering
- No docstrings, comments, or type annotations added to unchanged code
- No backwards-compatibility shims for removed code

## Notes

- This workspace root may host additional artifacts, but HC1 is the active git repository in scope for these instructions.
=======
# Tribal — Claude Configuration

## Project Overview
Workspace containing the HC1 project (`./HC1`), tracked at https://github.com/ChristianSAW/HC1.

## Key Directories
- `HC1/` — main project repository

## Workflow Preferences
- Confirm before pushing to remote branches
- Confirm before force-push or destructive git operations
- Prefer editing existing files over creating new ones

## Code Style
- Keep solutions minimal and focused; avoid over-engineering
- No docstrings, comments, or type annotations added to unchanged code
- No backwards-compatibility shims for removed code

## Notes
- This workspace root is not itself a git repository; HC1 has its own git repo
>>>>>>> 098e351 (Add CLAUDE.md, agent.md, and .gitignore)
