"""
MediaDrop Process & Service Manager
Handles port checking, graceful termination, and health check polling without third-party dependencies.
"""
import sys
import os
import time
import subprocess
import urllib.request
import urllib.error
import socket

PORTS = [8000, 3000]

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1.0)
        return s.connect_ex(("127.0.0.1", port)) == 0

def get_pids_on_port(port: int) -> list[int]:
    pids = set()
    try:
        output = subprocess.check_output(f"netstat -ano", shell=True, text=True, stderr=subprocess.DEVNULL)
        target = f":{port}"
        for line in output.splitlines():
            line = line.strip()
            if target in line and ("LISTENING" in line or "ESTABLISHED" in line):
                parts = line.split()
                if parts:
                    try:
                        pid = int(parts[-1])
                        if pid > 0 and pid != os.getpid():
                            pids.add(pid)
                    except ValueError:
                        pass
    except Exception:
        pass
    return list(pids)

def stop_all():
    print("[MediaDrop] Stopping active instances on ports 8000 and 3000...")
    killed_any = False
    for port in PORTS:
        pids = get_pids_on_port(port)
        for pid in pids:
            try:
                print(f"[MediaDrop] Terminating PID {pid} (port {port})...")
                subprocess.run(f"taskkill /F /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                killed_any = True
            except Exception as e:
                print(f"[MediaDrop] Could not stop PID {pid}: {e}")
    if killed_any:
        time.sleep(1.0)
        print("[MediaDrop] Stopped successfully.")
    else:
        print("[MediaDrop] No running instances detected.")

def wait_health(timeout_seconds: int = 25) -> bool:
    url = "http://127.0.0.1:8000/api/health"
    start_time = time.time()
    print("[MediaDrop] Waiting for backend API to be ready...", end="", flush=True)
    while time.time() - start_time < timeout_seconds:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "MediaDrop-Launcher/1.0"})
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                if resp.status == 200:
                    print(" [Ready]")
                    return True
        except Exception:
            pass
        print(".", end="", flush=True)
        time.sleep(0.75)
    print(" [Timeout]")
    return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python manage_servers.py [check|stop|wait-health]")
        sys.exit(1)
        
    action = sys.argv[1].lower()
    if action == "stop":
        stop_all()
        sys.exit(0)
    elif action == "check":
        in_use = [p for p in PORTS if is_port_in_use(p)]
        if in_use:
            print(f"Ports in use: {', '.join(str(p) for p in in_use)}")
            sys.exit(1)
        else:
            print("Ports free.")
            sys.exit(0)
    elif action == "wait-health":
        if wait_health():
            sys.exit(0)
        else:
            sys.exit(1)
    else:
        print(f"Unknown action: {action}")
        sys.exit(1)
