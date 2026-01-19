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

## Next AI Labs Fork - Semantic Memory Integration

This fork adds production-ready semantic memory injection powered by Agent Swarm, enabling Codex to leverage your organization's knowledge base and past learnings. All features are **opt-in** and do not change upstream defaults.

### 🚀 What's Different?

This fork automatically injects relevant context from your Agent Swarm knowledge base into every prompt, enabling Codex to:
- Remember solutions from previous sessions
- Access organizational patterns and best practices
- Leverage team knowledge without manual copy-paste
- Learn from past successes and failures

**Prerequisites:**
- Rust toolchain (1.92.0+)
- Just command runner: `cargo install just`
- Agent Swarm MCP: `git clone https://github.com/Next-AI-Labs-Inc/agent-swarm-mcp.git`

**Installation:**

```bash
# 1. Clone this fork
git clone https://github.com/Next-AI-Labs-Inc/codex.git
cd codex

# 2. Point to your Agent Swarm installation
export AGENT_SWARM_PATH="/path/to/agent-swarm-mcp"

# 3. Verify Agent Swarm works
$AGENT_SWARM_PATH/scripts/swarm -v "test query"

# 4. Build and run Codex
just build
just codex
```

### 💡 How It Works

On each prompt, Codex:
1. Extracts key terms from your input
2. Runs semantic vector search: `swarm -v --limit 5`
3. Injects relevant memories if found (3s timeout)
4. Logs all injections to `~/.codex/log/memory_injection.log`

**Injected format:**
```
Memories which may be helpful:
<relevant context from swarm>
```

**Performance:**
- Non-blocking with 3s timeout
- Only active when AGENT_SWARM_PATH is set
- Zero impact if disabled

**Implementation:**
- Core logic: `codex-rs/core/src/memory_search.rs`
- Integration: `codex-rs/core/src/codex.rs:385-425`

### 🧪 Testing

```bash
# 1. Test Agent Swarm directly
$AGENT_SWARM_PATH/scripts/swarm -v "authentication patterns"

# 2. Start Codex and ask a question
just codex
# Prompt: "How should I implement user authentication?"

# 3. Check injection log
tail ~/.codex/log/memory_injection.log
```

Example log output:
```
[2026-01-17 10:30:45 UTC]
Query: implement user authentication
Injected:
✓ Found 3 relevant memories about auth patterns
```

### 🛠️ Configuration

**Disable memory injection:**
```bash
unset AGENT_SWARM_PATH
```

**Custom log location:**
```bash
export CODEX_HOME="/custom/path"
# Logs to: $CODEX_HOME/log/memory_injection.log
```

**Adjust memory limit (default: 5):**
Edit `codex-rs/core/src/memory_search.rs:80`:
```rust
.arg("--limit").arg("10")
```

### 🐛 Troubleshooting

Memory injection not working?
```bash
# 1. Verify environment variable
echo $AGENT_SWARM_PATH

# 2. Test swarm directly
$AGENT_SWARM_PATH/scripts/swarm -v "test"

# 3. Check logs
tail -f ~/.codex/log/memory_injection.log
```

### 📚 Upstream Compatibility

This fork tracks `openai/codex:main` and can be rebased:
```bash
git remote add upstream https://github.com/openai/codex.git
git fetch upstream
git rebase upstream/main
```

This repository is licensed under the [Apache-2.0 License](LICENSE).
