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

## Next AI Labs Fork - Enhanced Features

This fork includes production-ready enhancements to improve developer workflow and agent memory capabilities. All features are **opt-in** and do not change upstream defaults.

### 🚀 Key Enhancements

#### 1. Automatic Stale Cache Recovery

**Problem Solved:** Rust incremental compilation can cause "no field on type" errors after pulling struct changes, requiring manual `cargo clean` intervention.

**Solution:** The `just build` recipe automatically detects and recovers from stale cache errors.

**How it works:**
```bash
just build    # Automatically detects stale cache and retries
```

When a "no field on type" error is detected:
1. Extracts the affected crate name from the error
2. Runs `cargo clean -p <crate>` automatically
3. Retries the build without manual intervention

**Implementation:** See justfile:8-40

#### 2. Semantic Memory Injection

**Problem Solved:** Agents lack context from previous sessions and organizational knowledge when responding to prompts.

**Solution:** Automatically injects relevant memories from your Agent Swarm knowledge base into each user prompt.

**Setup:**
```bash
# Set your Agent Swarm path
export AGENT_SWARM_PATH="/path/to/agent-swarm-mcp"

# Verify swarm is accessible
$AGENT_SWARM_PATH/scripts/swarm -v "test query"
```

**How it works:**
- On each user turn, extracts key terms from your prompt
- Runs semantic vector search: `swarm -v --limit 5`
- Injects results only if relevant memories are found
- Timeout protection (3 seconds) to prevent blocking

**Injected format:**
```
Memories which may be helpful:
<relevant context from swarm>
```

**Logging & Debugging:**
All memory injections are logged to `~/.codex/log/memory_injection.log`:
```
[2026-01-17 10:30:45 UTC]
Query: implement user authentication
Injected:
✓ Found 3 relevant memories about auth patterns
```

**Implementation:**
- Core logic: codex-rs/core/src/memory_search.rs
- Integration: codex-rs/core/src/codex.rs:385-425

**Performance:**
- Non-blocking with 3s timeout
- Only queries when AGENT_SWARM_PATH is configured
- No injection = no performance impact

#### 3. Enhanced Build Feedback

**Problem Solved:** Long builds provide no feedback, causing developer uncertainty.

**Solution:** Clear progress indicators during build process.

**Features:**
- Start message: `"Building Codex (cargo build). This may take a few minutes..."`
- Real-time cargo output via `tee`
- Completion message: `"Build complete."`
- Preserved output for debugging

**Implementation:** See justfile:12-19

### 📋 Prerequisites

**Required for all features:**
- Rust toolchain (1.92.0+)
- Just command runner: `cargo install just`

**Required for memory injection:**
- Agent Swarm MCP with vector search support
- Environment variable: `AGENT_SWARM_PATH`
- Working swarm index (test with `swarm -v`)

### 🔧 Quick Start

```bash
# Clone this fork
git clone https://github.com/Next-AI-Labs-Inc/codex.git
cd codex

# Build with automatic cache recovery
just build

# Optional: Enable memory injection
export AGENT_SWARM_PATH="/path/to/agent-swarm-mcp"

# Run Codex
just codex
# or
cargo run --bin codex
```

### 🧪 Testing the Enhancements

**Test stale cache recovery:**
```bash
# This will auto-recover if cache issues occur
just build
```

**Test memory injection:**
```bash
# Check if swarm is working
$AGENT_SWARM_PATH/scripts/swarm -v "authentication patterns"

# Start Codex and enter a prompt
just codex

# Enter: "How should I implement user authentication?"
# Check log: tail ~/.codex/log/memory_injection.log
```

### 📊 Feature Comparison

| Feature | Upstream | This Fork |
|---------|----------|-----------|
| Build cache recovery | Manual `cargo clean` | Automatic detection & retry |
| Memory context | None | Semantic search integration |
| Build feedback | Minimal | Detailed progress indicators |
| Agent Swarm integration | Not available | Production-ready |

### 🔍 Implementation Details

**Memory Search Algorithm:**
1. Extract content text from user input
2. Build query from text (multi-word terms preserved)
3. Execute `swarm -v --limit 5` with 3s timeout
4. Filter noise (headers, empty lines, ANSI codes)
5. Inject if results found, skip if empty

**Cache Recovery Regex:**
- Pattern: `no field.*on type`
- Extraction: `\([^:]*\)::` → crate name
- Conversion: snake_case → kebab-case
- Fallback: Full `cargo clean` if extraction fails

### 🛠️ Configuration

**Memory injection can be disabled:**
```bash
unset AGENT_SWARM_PATH    # Disables memory search
```

**Custom log location:**
```bash
export CODEX_HOME="/custom/path"
# Logs to: $CODEX_HOME/log/memory_injection.log
```

**Adjust memory search limit:**
Edit `codex-rs/core/src/memory_search.rs:80`:
```rust
.arg("--limit").arg("10")  // Default is 5
```

### 🐛 Troubleshooting

**Memory injection not working?**
```bash
# Verify AGENT_SWARM_PATH
echo $AGENT_SWARM_PATH

# Test swarm directly
$AGENT_SWARM_PATH/scripts/swarm -v "test"

# Check logs
tail -f ~/.codex/log/memory_injection.log
```

**Build cache still failing?**
```bash
# Manual fallback
cargo clean
just build
```

### 📚 Upstream Compatibility

This fork tracks `openai/codex:main` and can be rebased onto upstream releases:

```bash
git remote add upstream https://github.com/openai/codex.git
git fetch upstream
git rebase upstream/main
```

All enhancements are additive and do not modify core Codex behavior.

This repository is licensed under the [Apache-2.0 License](LICENSE).
