import argparse
import subprocess
import sys
import time
import socket
import os
import signal
import atexit


def parse_args():
    parser = argparse.ArgumentParser(
        description="Manage server lifecycle for web app testing.\n\n"
                    "Starts one or more servers, waits for them to be ready, "
                    "runs your script, then cleans up.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  # Single server\n"
            "  python scripts/with_server.py --server \"npm run dev\" --port 5173 ^\n"
            "      -- python your_automation.py\n\n"
            "  # Multiple servers (backend + frontend)\n"
            "  python scripts/with_server.py ^\n"
            "      --server \"cd backend && python server.py\" --port 3000 ^\n"
            "      --server \"cd frontend && npm run dev\" --port 5173 ^\n"
            "      -- python your_automation.py\n"
        ),
    )
    parser.add_argument(
        "--server", "-s",
        action="append",
        dest="servers",
        metavar="COMMAND",
        help="Server command to run (can be specified multiple times)",
    )
    parser.add_argument(
        "--port", "-p",
        type=int,
        action="append",
        dest="ports",
        metavar="PORT",
        help="Port the server listens on (one per --server, in order)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="Max seconds to wait for each server to start (default: 30)",
    )
    parser.add_argument(
        "user_script",
        nargs=argparse.REMAINDER,
        help="Your script and its arguments (after -- separator)",
    )
    return parser.parse_args()


def port_is_open(host, port, timeout=2):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (OSError, socket.error):
        return False


def wait_for_server(host, port, timeout, label):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if port_is_open(host, port):
            print(f"[with_server] {label} is ready on port {port}", flush=True)
            return True
        time.sleep(0.5)
    return False


def cleanup(processes):
    for proc in processes:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait()


def main():
    args = parse_args()

    if not args.servers:
        print("error: at least one --server is required", file=sys.stderr)
        sys.exit(1)

    if not args.ports or len(args.ports) != len(args.servers):
        print("error: must specify one --port per --server", file=sys.stderr)
        sys.exit(1)

    if not args.user_script or args.user_script[0] != "--":
        print("error: separate your script with --", file=sys.stderr)
        sys.exit(1)

    user_cmd = args.user_script[1:]
    if not user_cmd:
        print("error: no user script provided after --", file=sys.stderr)
        sys.exit(1)

    processes = []
    atexit.register(cleanup, processes)

    try:
        for i, (cmd, port) in enumerate(zip(args.servers, args.ports), 1):
            label = f"server-{i}"
            print(f"[with_server] Starting {label}: {cmd}", flush=True)
            proc = subprocess.Popen(
                cmd,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
            processes.append(proc)

            ready = wait_for_server("127.0.0.1", port, args.timeout, label)
            if not ready:
                print(
                    f"[with_server] {label} did not become ready within "
                    f"{args.timeout}s on port {port}",
                    file=sys.stderr,
                )
                sys.exit(1)

        print("[with_server] All servers ready. Running user script...", flush=True)
        result = subprocess.run(user_cmd, shell=False)
        sys.exit(result.returncode)

    finally:
        cleanup(processes)


if __name__ == "__main__":
    main()
