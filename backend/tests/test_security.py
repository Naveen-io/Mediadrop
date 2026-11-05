import pytest
from fastapi import HTTPException
from app.core.security import (
    validate_url,
    sanitize_filename,
    validate_format,
    parse_timecode,
)

def test_validate_url_valid():
    # Public domains should pass validation
    url = "https://example.com/video/12345"
    assert validate_url(url) == url

def test_validate_url_rejects_non_http():
    with pytest.raises(HTTPException) as exc:
        validate_url("file:///etc/passwd")
    assert exc.value.status_code == 400

    with pytest.raises(HTTPException) as exc:
        validate_url("ftp://ftp.example.com/file")
    assert exc.value.status_code == 400

def test_validate_url_rejects_ssrf_localhost():
    with pytest.raises(HTTPException) as exc:
        validate_url("http://localhost:8000/internal")
    assert exc.value.status_code in (400, 403)

    with pytest.raises(HTTPException) as exc:
        validate_url("http://127.0.0.1:8000/admin")
    assert exc.value.status_code in (400, 403)

def test_validate_url_rejects_private_ips():
    # 10.0.0.1
    with pytest.raises(HTTPException) as exc:
        validate_url("http://10.0.0.1/secret")
    assert exc.value.status_code in (400, 403)

    # 192.168.1.1
    with pytest.raises(HTTPException) as exc:
        validate_url("http://192.168.1.1/router")
    assert exc.value.status_code in (400, 403)

    # AWS/GCP metadata
    with pytest.raises(HTTPException) as exc:
        validate_url("http://169.254.169.254/latest/meta-data/")
    assert exc.value.status_code in (400, 403)

def test_validate_url_rejects_credentials():
    with pytest.raises(HTTPException) as exc:
        validate_url("https://admin:pass@example.com/video")
    assert exc.value.status_code == 400

def test_sanitize_filename():
    assert sanitize_filename("normal_video.mp4") == "normal_video.mp4"
    
    # Path traversal
    sanitized = sanitize_filename("../../etc/passwd.mp4")
    assert ".." not in sanitized
    assert "/" not in sanitized
    assert "\\" not in sanitized

    # Illegal OS characters
    bad_chars = 'my"cool<video>:part?1*.mp4'
    cleaned = sanitize_filename(bad_chars)
    for c in '<>:"/\\|?*':
        assert c not in cleaned

    # Empty name fallback
    assert sanitize_filename("") == "mediadrop_export.mp4"
    assert sanitize_filename("   ") == "mediadrop_export.mp4"

def test_validate_format():
    allowed = ["mp4", "webm", "mp3", "m4a", "wav"]
    assert validate_format("mp4", allowed) == "mp4"
    assert validate_format("MP3", allowed) == "mp3"

    with pytest.raises(HTTPException) as exc:
        validate_format("exe", allowed)
    assert exc.value.status_code == 400

    with pytest.raises(HTTPException) as exc:
        validate_format("sh", allowed)
    assert exc.value.status_code == 400

def test_parse_timecode():
    assert parse_timecode(None) is None
    assert parse_timecode("") is None
    assert parse_timecode("30") == 30.0
    assert parse_timecode("01:30") == 90.0
    assert parse_timecode("01:02:03") == 3723.0

    with pytest.raises(HTTPException) as exc:
        parse_timecode("invalid:time:code:extra")
    assert exc.value.status_code == 400

    with pytest.raises(HTTPException) as exc:
        parse_timecode("-10")
    assert exc.value.status_code == 400
