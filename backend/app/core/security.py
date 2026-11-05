import ipaddress
import re
import socket
import time
from collections import defaultdict, deque
from typing import Optional, Tuple
from urllib.parse import urlparse
from fastapi import HTTPException, status
from app.core.config import settings

# Disallowed internal host substrings or exact hostnames
BLOCKED_HOSTNAMES = {
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "metadata.google.internal",
    "169.254.169.254",
    "instance-data",
}

# Regex for illegal filename characters on Windows and Unix: < > : " / \ | ? * and control chars
ILLEGAL_FILENAME_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')

# Rate limiter storage: ip -> deque of timestamps
_rate_limits = defaultdict(deque)

def check_rate_limit(client_ip: str) -> None:
    """Enforces in-memory sliding window rate limiting per client IP."""
    now = time.time()
    q = _rate_limits[client_ip]
    
    # Remove timestamps older than window
    cutoff = now - settings.RATE_LIMIT_WINDOW_SEC
    while q and q[0] < cutoff:
        q.popleft()
        
    if len(q) >= settings.RATE_LIMIT_CALLS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait a moment before sending more requests."
        )
    q.append(now)

def validate_url(url: str) -> str:
    """
    Validates that a URL is a public http/https destination.
    Protects against SSRF by resolving DNS and rejecting private/loopback/link-local IP addresses.
    """
    if not url or not isinstance(url, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL is required and must be a string."
        )

    url = url.strip()
    if len(url) > 2048:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL is too long (maximum 2048 characters)."
        )

    try:
        parsed = urlparse(url)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed URL."
        )

    if parsed.scheme not in ("http", "https"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only HTTP and HTTPS URLs are supported."
        )

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL must contain a valid domain or host name."
        )

    hostname_lower = hostname.lower()

    # Block obvious local names
    if hostname_lower in BLOCKED_HOSTNAMES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to internal or loopback hosts is prohibited."
        )

    if (
        hostname_lower.endswith(".local")
        or hostname_lower.endswith(".internal")
        or hostname_lower.endswith(".lan")
        or hostname_lower.endswith(".localhost")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to local or internal domain names is prohibited."
        )

    # Disallow credentials in URL
    if parsed.username or parsed.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URLs containing credentials are not permitted."
        )

    # Resolve IP and verify public routing
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        addr_infos = socket.getaddrinfo(hostname, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not resolve hostname. Please check that the URL is accessible."
        )

    for entry in addr_infos:
        sockaddr = entry[4]
        ip_str = sockaddr[0]
        try:
            ip_obj = ipaddress.ip_address(ip_str)
        except ValueError:
            continue

        if (
            ip_obj.is_loopback
            or ip_obj.is_private
            or ip_obj.is_link_local
            or ip_obj.is_multicast
            or ip_obj.is_reserved
            or ip_obj.is_unspecified
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to private or local network IP addresses is strictly blocked."
            )

    return url

def sanitize_filename(name: str, default_ext: str = "mp4", max_length: int = 100) -> str:
    """
    Sanitizes filename to prevent directory traversal and remove invalid OS characters.
    """
    if not name or not name.strip():
        return f"mediadrop_export.{default_ext}"

    name = name.strip()

    # Split extension if present
    if "." in name:
        base, _, ext = name.rpartition(".")
        if not ext.isalnum() or len(ext) > 6:
            base = name
            ext = default_ext
    else:
        base = name
        ext = default_ext

    # Remove illegal chars
    sanitized_base = ILLEGAL_FILENAME_CHARS.sub("_", base)
    
    # Remove traversal sequences
    sanitized_base = sanitized_base.replace("..", "_").replace("/", "_").replace("\\", "_")
    
    # Strip leading/trailing dots and spaces
    sanitized_base = sanitized_base.strip(". ")
    
    if not sanitized_base:
        sanitized_base = "mediadrop_media"

    # Truncate to reasonable length
    if len(sanitized_base) > max_length:
        sanitized_base = sanitized_base[:max_length].rstrip(". ")

    return f"{sanitized_base}.{ext}"

def validate_format(format_name: str, allowed: list[str]) -> str:
    """Validates format against whitelist."""
    fmt = format_name.strip().lower()
    if fmt not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Format '{format_name}' is not supported. Allowed formats: {', '.join(allowed)}"
        )
    return fmt

def parse_timecode(time_str: Optional[str]) -> Optional[float]:
    """
    Parses a timecode string (e.g. '01:23:45', '12.5', '03:15') into seconds.
    Returns None if empty. Raises HTTPException if invalid.
    """
    if not time_str or not time_str.strip():
        return None

    s = time_str.strip()
    # Check if pure float / int
    try:
        val = float(s)
        if val < 0:
            raise ValueError()
        return val
    except ValueError:
        pass

    # Parse HH:MM:SS or MM:SS
    parts = s.split(":")
    if len(parts) not in (2, 3):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid time format '{time_str}'. Use SS, MM:SS, or HH:MM:SS."
        )

    try:
        parts_flt = [float(p) for p in parts]
        for p in parts_flt:
            if p < 0:
                raise ValueError()
        if len(parts) == 2:
            return parts_flt[0] * 60 + parts_flt[1]
        elif len(parts) == 3:
            return parts_flt[0] * 3600 + parts_flt[1] * 60 + parts_flt[2]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid time components in '{time_str}'."
        )
    return None
