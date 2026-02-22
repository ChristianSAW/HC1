# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HC1 is a calendar and scheduling productivity app. It is currently in early-stage development — no build system, language framework, or test infrastructure has been configured yet.

### Product Goals

- Help users manage their time through calendar views, event scheduling, and time-blocking
- Tech stack is not yet decided; evaluate options before initializing the project

## Repository Structure

- `AGENT.md` — Machine-readable instructions for automated agents operating on this repo. Keep it short and stable.
- `.claude/settings.local.json` — Local Claude Code permission settings (allows `git config`, `find`, `git ls-tree` commands).

## Development Notes

- This project follows an agent-first development approach, designed for iterative development with AI agent assistance.
- When adding new infrastructure (build tools, test frameworks, linting), update this file accordingly.
