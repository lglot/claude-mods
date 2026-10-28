# claude-mods

Claude Code mods (function-hook plugins), published as a plugin marketplace.

## secret-input

`/secret <KEY>` (or `/secret <file> <KEY>`) opens a pane with a masked field. Click it, type or paste the value, press Enter: the mod runs `secrets add <file> <KEY>` with the value on stdin. The value never reaches the model or the transcript. `mostra`/`nascondi` toggles plain text. With one argument the file is the key lowercased (`GITHUB_TOKEN` goes to `github_token`).

Requires a `secrets` CLI in `~/.local/bin` or on `PATH` whose `add <file> <KEY>` reads the value from stdin (for example a wrapper over a SOPS+age vault). The mod adds `~/.local/bin` and Homebrew to `PATH`, since the desktop app's environment may lack them. The masked field draws in the terminal and the desktop app, not on mobile or in VS Code.

Never type the value after the command: the command line itself is recorded in the transcript.

### Install

At the prompt of a terminal session:

```
/plugin install secret-input --marketplace lglot/claude-mods
```

From a shell:

```bash
claude plugin install secret-input --marketplace lglot/claude-mods
```

In the desktop app: click + next to the prompt box, then Plugins, Add marketplace with `lglot/claude-mods`, then Add plugin.
