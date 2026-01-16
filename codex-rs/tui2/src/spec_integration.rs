use chrono::Utc;
use codex_core::config::Config;
use serde_json::json;
use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};

const SPEC_DEFAULT_PORT: u16 = 8840;

#[derive(Clone)]
pub(crate) struct SpecLogger {
    slug: String,
    log_path: PathBuf,
    file: Arc<Mutex<File>>,
    debug: bool,
}

impl SpecLogger {
    pub(crate) fn new(slug: String, log_path: PathBuf, debug: bool) -> io::Result<Self> {
        let mut opts = OpenOptions::new();
        opts.create(true).append(true);

        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            opts.mode(0o600);
        }

        let file = opts.open(&log_path)?;
        Ok(Self {
            slug,
            log_path,
            file: Arc::new(Mutex::new(file)),
            debug,
        })
    }

    pub(crate) fn slug(&self) -> &str {
        &self.slug
    }

    pub(crate) fn log_message(&self, event: &str, detail: &str) {
        let line = format!(
            "{} | {} | {}",
            Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
            event,
            sanitize(detail)
        );
        if self.debug {
            tracing::info!("[spec] {}", line);
        }
        let mut guard = match self.file.lock() {
            Ok(lock) => lock,
            Err(poisoned) => poisoned.into_inner(),
        };
        if let Err(err) = writeln!(guard, "{line}") {
            tracing::warn!("spec log write failed: {err}");
        }
    }
}

pub(crate) struct SpecSession {
    pub(crate) logger: SpecLogger,
    pub(crate) ui_url: String,
}

pub(crate) struct SpecSessionConfig {
    pub(crate) enabled: bool,
    pub(crate) debug: bool,
}

pub(crate) fn bootstrap_spec_session(
    config: &Config,
    spec_config: SpecSessionConfig,
) -> io::Result<Option<SpecSession>> {
    if !spec_config.enabled {
        return Ok(None);
    }

    let spec_home = resolve_spec_home();
    ensure_spec_dirs(&spec_home)?;

    let slug = format!("codex-session-{}", Utc::now().format("%Y%m%dT%H%M%SZ"));
    let snapshot_path = spec_home.join("snapshots").join(format!("{slug}.json"));
    if !snapshot_path.exists() {
        let snapshot = json!({
            "feature": slug,
            "repo": config.cwd.to_string_lossy(),
            "paths": [config.cwd.to_string_lossy()],
            "captured_at": Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
            "intent": "Codex -spec session",
            "context": "Auto-generated spec session from Codex -spec mode.",
            "meta_summary": "Codex session captured via -spec mode.",
        });
        fs::write(&snapshot_path, serde_json::to_string_pretty(&snapshot)?)?;
    }

    let log_path = spec_home.join("logs").join(format!("{slug}.log"));
    let logger = SpecLogger::new(slug, log_path, spec_config.debug)?;
    let ui_url = ensure_spec_ui_running(spec_config.debug)?;

    Ok(Some(SpecSession { logger, ui_url }))
}

fn resolve_spec_home() -> PathBuf {
    if let Ok(path) = std::env::var("CODEX_SPEC_TOOL_HOME") {
        return PathBuf::from(path);
    }
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home)
        .join(".codex")
        .join("extensions")
        .join("spec-tool")
}

fn ensure_spec_dirs(home: &Path) -> io::Result<()> {
    fs::create_dir_all(home.join("snapshots"))?;
    fs::create_dir_all(home.join("clarifications"))?;
    fs::create_dir_all(home.join("logs"))?;
    fs::create_dir_all(home.join("reports"))?;
    fs::create_dir_all(home.join("specs"))?;
    Ok(())
}

fn ensure_spec_ui_running(debug: bool) -> io::Result<String> {
    if is_port_open(SPEC_DEFAULT_PORT) {
        return Ok(format!("http://localhost:{SPEC_DEFAULT_PORT}/"));
    }

    let ui_dir = resolve_spec_ui_dir().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            "spec UI directory not found (extensions/spec-tool/ui/spec-flow-console)",
        )
    })?;

    let mut cmd = Command::new("pnpm");
    cmd.arg("dev");
    cmd.current_dir(ui_dir);
    cmd.env("PORT", SPEC_DEFAULT_PORT.to_string());
    cmd.env("CODEX_SPEC_TOOL_HOME", resolve_spec_home());
    cmd.stdin(Stdio::null());
    if debug {
        cmd.stdout(Stdio::inherit()).stderr(Stdio::inherit());
    } else {
        cmd.stdout(Stdio::null()).stderr(Stdio::null());
    }

    let _ = cmd.spawn();

    Ok(format!("http://localhost:{SPEC_DEFAULT_PORT}/"))
}

fn resolve_spec_ui_dir() -> Option<PathBuf> {
    if let Ok(path) = std::env::var("CODEX_SPEC_TOOL_UI_DIR") {
        let candidate = PathBuf::from(path);
        if candidate.join("package.json").exists() {
            return Some(candidate);
        }
    }

    let mut dir = std::env::current_dir().ok()?;
    loop {
        let candidate = dir
            .join("extensions")
            .join("spec-tool")
            .join("ui")
            .join("spec-flow-console");
        if candidate.join("package.json").exists() {
            return Some(candidate);
        }
        if !dir.pop() {
            break;
        }
    }
    None
}

fn is_port_open(port: u16) -> bool {
    TcpStream::connect(("127.0.0.1", port)).is_ok()
}

fn sanitize(detail: &str) -> String {
    detail.replace('\n', "\\n")
}

