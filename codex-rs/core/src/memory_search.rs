use regex_lite::Regex;
use std::path::PathBuf;
use chrono::Utc;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

const MEMORY_PREFIX: &str = "Memories which may be helpful:\n";

fn swarm_script_path() -> Option<PathBuf> {
    let swarm_root = std::env::var_os("AGENT_SWARM_PATH")?;
    let mut path = PathBuf::from(swarm_root);
    path.push("scripts");
    path.push("swarm");
    if path.exists() {
        Some(path)
    } else {
        None
    }
}

fn strip_ansi(input: &str) -> String {
    // Keep this simple: strip ANSI escape sequences to avoid coloring the prompt.
    let ansi = Regex::new(r"\x1b\[[0-9;]*m").unwrap_or_else(|_| Regex::new("$^").unwrap());
    ansi.replace_all(input, "").to_string()
}

fn trim_swarm_output(raw: &str) -> String {
    let mut lines = Vec::new();
    for line in raw.lines() {
        if line.starts_with("Commands:") {
            break;
        }
        if line.starts_with("Vector search")
            || line.starts_with("Relevant Memories")
            || line.starts_with("Showing ")
        {
            continue;
        }
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        lines.push(trimmed.to_string());
    }
    lines.join("\n")
}

fn is_empty_or_noise(text: &str) -> bool {
    let lowered = text.to_lowercase();
    text.trim().is_empty()
        || lowered.contains("no matches")
        || lowered.contains("no results")
        || lowered.contains("0 records")
}

pub async fn build_memory_injection(query: &str) -> Option<String> {
    let query = query.trim();
    if query.is_empty() {
        return None;
    }

    let swarm_path = swarm_script_path()?;
    let output = timeout(
        Duration::from_secs(3),
        Command::new(swarm_path)
            .arg("-c")
            .arg("-v")
            .arg(query)
            .arg("--limit")
            .arg("5")
            .env("NO_COLOR", "1")
            .output(),
    )
    .await
    .ok()?
    .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let cleaned = strip_ansi(&stdout);
    let trimmed = trim_swarm_output(&cleaned);
    if is_empty_or_noise(&trimmed) {
        return None;
    }

    let mut body = trimmed;
    if body.len() > 1200 {
        body.truncate(1200);
        body.push_str("...");
    }

    Some(format!("{MEMORY_PREFIX}{body}"))
}

pub async fn log_memory_injection(
    codex_home: &std::path::Path,
    query: &str,
    injected: Option<&str>,
) {
    let mut log_dir = codex_home.to_path_buf();
    log_dir.push("log");
    let mut log_path = log_dir.clone();
    log_path.push("memory_injection.log");

    let _ = fs::create_dir_all(&log_dir).await;

    let timestamp = Utc::now().to_rfc3339();
    let mut entry = String::new();
    entry.push_str(&format!("[{timestamp}] query: {query}\n"));
    match injected {
        Some(text) => {
            let mut snippet = text.trim().to_string();
            if snippet.len() > 2000 {
                snippet.truncate(2000);
                snippet.push_str("...");
            }
            entry.push_str("injected:\n");
            entry.push_str(&snippet);
            entry.push('\n');
        }
        None => {
            entry.push_str("injected: <none>\n");
        }
    }
    entry.push('\n');

    if let Ok(mut file) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .await
    {
        let _ = file.write_all(entry.as_bytes()).await;
    }
}
