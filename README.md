<p align="center"><code>npm i -g @openai/codex</code><br />or <code>brew install --cask codex</code></p>
<p align="center"><strong>Codex CLI</strong> is a coding agent from OpenAI that runs locally on your computer.
<p align="center">
  <img src="./.github/codex-cli-splash.png" alt="Codex CLI splash" width="80%" />
</p>
</br>
If you want Codex in your code editor (VS Code, Cursor, Windsurf), <a href="https://developers.openai.com/codex/ide">install in your IDE.</a>
</br>If you are looking for the <em>cloud-based agent</em> from OpenAI, <strong>Codex Web</strong>, go to <a href="https://chatgpt.com/codex">chatgpt.com/codex</a>.</p>

---

## Quickstart

### Installing and running Codex CLI

Install globally with your preferred package manager:

```shell
# Install using npm
npm install -g @openai/codex
```

```shell
# Install using Homebrew
brew install --cask codex
```

Then simply run `codex` to get started.

<details>
<summary>You can also go to the <a href="https://github.com/openai/codex/releases/latest">latest GitHub Release</a> and download the appropriate binary for your platform.</summary>

Each GitHub Release contains many executables, but in practice, you likely want one of these:

- macOS
  - Apple Silicon/arm64: `codex-aarch64-apple-darwin.tar.gz`
  - x86_64 (older Mac hardware): `codex-x86_64-apple-darwin.tar.gz`
- Linux
  - x86_64: `codex-x86_64-unknown-linux-musl.tar.gz`
  - arm64: `codex-aarch64-unknown-linux-musl.tar.gz`

Each archive contains a single entry with the platform baked into the name (e.g., `codex-x86_64-unknown-linux-musl`), so you likely want to rename it to `codex` after extracting it.

</details>

### Using Codex with your ChatGPT plan

Run `codex` and select **Sign in with ChatGPT**. We recommend signing into your ChatGPT account to use Codex as part of your Plus, Pro, Team, Edu, or Enterprise plan. [Learn more about what's included in your ChatGPT plan](https://help.openai.com/en/articles/11369540-codex-in-chatgpt).

You can also use Codex with an API key, but this requires [additional setup](https://developers.openai.com/codex/auth#sign-in-with-an-api-key).

## Docs

- [**Codex Documentation**](https://developers.openai.com/codex)
- [**Contributing**](./docs/contributing.md)
- [**Installing & building**](./docs/install.md)
- [**Open source fund**](./docs/open-source-fund.md)

## Local enhancements in this fork

This fork adds a small, optional set of local-only behaviors to improve workflow without changing the upstream defaults.

### Auto-build on run (local)

The launcher script runs `just build` before starting the CLI, so stale caches are cleaned and rebuilds are automatic. This is local-only and uses your existing Rust toolchain.

### Automatic memory injection (semantic)

If `AGENT_SWARM_PATH` is set and `$AGENT_SWARM_PATH/scripts/swarm` exists, Codex will run a semantic search on every user prompt and inject the top matches into the prompt **only when results are found**.

Injected format:

```
Memories which may be helpful:
{search results}
```

Notes:
- Uses `swarm -v` (semantic vector search) with a small `--limit 5` and a short output cap.
- If `swarm` is missing or returns no relevant matches, nothing is injected.

#### Where memories come from

Memory search relies on your Swarm JSONL store and its vector index. Ensure your Swarm tooling is initialized and that you are creating memories using the Swarm scripts or MCP tools (so the index stays current).

Quick sanity check (manual):

```bash
$AGENT_SWARM_PATH/scripts/swarm -v "your test query"
```

#### Memory injection logs

Each user turn writes a small log entry so you can see the query and what (if anything) was injected:

`~/.codex/log/memory_injection.log` (or `$CODEX_HOME/log/memory_injection.log` if `CODEX_HOME` is set).

### AgentDB MCP helper (optional)

This fork includes lightweight scripts to start the AgentDB MCP server using your shared Swarm install. This is optional, but it gives Codex access to AgentDB-backed memory tools.

#### Prereqs (one time)

```bash
export AGENT_SWARM_PATH="/path/to/agent-swarm-mcp"
./scripts/agentdb-setup
```

#### Start AgentDB MCP

```bash
export AGENT_SWARM_PATH="/path/to/agent-swarm-mcp"
./scripts/agentdb-mcp
```

#### Wire into Codex (config snippet)

Add this to `~/.codex/config.toml`:

```toml
[mcp_servers.agentdb]
command = "/bin/bash"
args = ["-lc", "/path/to/codex3/scripts/agentdb-cli mcp start"]

[mcp_servers.agentdb.env]
AGENT_SWARM_PATH = "/path/to/agent-swarm-mcp"
```

Notes:
- Uses a local AgentDB CLI installed by `./scripts/agentdb-setup`.
- Default DB path: `$AGENT_SWARM_PATH/data/agentdb/agentdb.db` (override with `AGENTDB_PATH`).
- Logs: `$AGENT_SWARM_PATH/data/agentdb-mcp.log`

This repository is licensed under the [Apache-2.0 License](LICENSE).
