import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert "version" in data
        assert "ffmpeg_installed" in data
        assert "ytdlp_version" in data

@pytest.mark.asyncio
async def test_parse_validation_missing_url():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/parse", json={})
        assert res.status_code == 422

@pytest.mark.asyncio
async def test_parse_validation_ssrf():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/parse", json={"url": "http://127.0.0.1/test"})
        assert res.status_code in (400, 403)
        assert "blocked" in res.json()["detail"].lower() or "prohibited" in res.json()["detail"].lower()

@pytest.mark.asyncio
async def test_download_validation_invalid_format():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/download", json={
            "url": "https://example.com/media",
            "output_type": "video",
            "format": "invalid_extension"
        })
        assert res.status_code in (400, 422)

@pytest.mark.asyncio
async def test_batch_validation_empty_urls():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/batch", json={
            "urls": [],
            "output_type": "video",
            "format": "mp4"
        })
        assert res.status_code == 422

@pytest.mark.asyncio
async def test_batch_validation_too_many_urls():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        urls = [f"https://example.com/item/{i}" for i in range(15)]
        res = await client.post("/api/batch", json={
            "urls": urls,
            "output_type": "video",
            "format": "mp4"
        })
        assert res.status_code == 422
