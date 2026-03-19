"""Ollama process lifecycle management.

Handles auto-starting Ollama when needed and cleaning up on exit.
"""

import atexit
import shutil
import signal
import subprocess
import time
import urllib.request

DEFAULT_BASE_URL = "http://localhost:11434"

# Module-level state: the subprocess we spawned (if any)
_managed_process: subprocess.Popen | None = None
_cleanup_registered: bool = False


def is_running(base_url: str = DEFAULT_BASE_URL) -> bool:
    """Check if Ollama is responding at the given URL."""
    try:
        urllib.request.urlopen(base_url, timeout=2)
        return True
    except OSError:
        return False


def ensure_running(base_url: str = DEFAULT_BASE_URL) -> None:
    """Start Ollama as a child process if it isn't already running.

    If Ollama is already running (started externally), this is a no-op.
    If we start it, it will be automatically killed when hc1 exits.
    """
    if is_running(base_url):
        return

    if not shutil.which("ollama"):
        raise RuntimeError(
            "Ollama is not installed. Install it from https://ollama.ai"
        )

    global _managed_process
    _managed_process = subprocess.Popen(
        ["ollama", "serve"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Poll until ready
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        if is_running(base_url):
            _register_cleanup()
            return
        time.sleep(0.3)

    # Failed to start — clean up
    _managed_process.kill()
    _managed_process = None
    raise RuntimeError("Ollama failed to start within 10 seconds.")


def stop_managed() -> None:
    """Terminate the Ollama process we spawned (if any). No-op otherwise."""
    global _managed_process
    if _managed_process is None:
        return

    _managed_process.terminate()
    try:
        _managed_process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        _managed_process.kill()
        _managed_process.wait()
    _managed_process = None


def _register_cleanup() -> None:
    global _cleanup_registered
    if _cleanup_registered:
        return
    atexit.register(stop_managed)
    for sig in (signal.SIGTERM, signal.SIGINT):
        prev = signal.getsignal(sig)
        def handler(signum, frame, _prev=prev):
            stop_managed()
            if callable(_prev) and _prev not in (signal.SIG_DFL, signal.SIG_IGN):
                _prev(signum, frame)
            elif _prev == signal.SIG_DFL:
                signal.signal(signum, signal.SIG_DFL)
                signal.raise_signal(signum)
        signal.signal(sig, handler)
    _cleanup_registered = True
