# ============================================================
# CHIMERA MODULE STATS ENDPOINTS
# ============================================================

class ProxyStats(BaseModel):
    user_id: str
    session_id: str
    bandwidth_mb: float
    revenue: float

class CDNStats(BaseModel):
    user_id: str
    session_id: str
    storage_mb: float
    bandwidth_mb: float
    revenue: float

class AIStats(BaseModel):
    user_id: str
    session_id: str
    inferences: int
    total_inferences: int
    revenue: float

@app.post("/api/proxy/stats")
async def proxy_stats(stats: ProxyStats):
    # Store proxy stats in Supabase (or mock)
    if not supabase:
        return {"status": "ok", "message": "Proxy stats received (mock)"}
    try:
        data = {
            "user_id": stats.user_id,
            "session_id": stats.session_id,
            "bandwidth_mb": stats.bandwidth_mb,
            "revenue": stats.revenue,
            "timestamp": datetime.utcnow().isoformat()
        }
        supabase.table("proxy_stats").insert(data).execute()
        # Optionally add to earnings
        supabase.table("earnings").insert({
            "user_id": stats.user_id,
            "amount": stats.revenue,
            "type": "proxy",
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        return {"status": "ok", "message": "Proxy stats recorded"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/cdn/stats")
async def cdn_stats(stats: CDNStats):
    if not supabase:
        return {"status": "ok", "message": "CDN stats received (mock)"}
    try:
        data = {
            "user_id": stats.user_id,
            "session_id": stats.session_id,
            "storage_mb": stats.storage_mb,
            "bandwidth_mb": stats.bandwidth_mb,
            "revenue": stats.revenue,
            "timestamp": datetime.utcnow().isoformat()
        }
        supabase.table("cdn_stats").insert(data).execute()
        supabase.table("earnings").insert({
            "user_id": stats.user_id,
            "amount": stats.revenue,
            "type": "cdn",
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        return {"status": "ok", "message": "CDN stats recorded"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/ai/stats")
async def ai_stats(stats: AIStats):
    if not supabase:
        return {"status": "ok", "message": "AI stats received (mock)"}
    try:
        data = {
            "user_id": stats.user_id,
            "session_id": stats.session_id,
            "inferences": stats.inferences,
            "total_inferences": stats.total_inferences,
            "revenue": stats.revenue,
            "timestamp": datetime.utcnow().isoformat()
        }
        supabase.table("ai_stats").insert(data).execute()
        supabase.table("earnings").insert({
            "user_id": stats.user_id,
            "amount": stats.revenue,
            "type": "ai",
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        return {"status": "ok", "message": "AI stats recorded"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/routing/rates")
async def routing_rates(user_id: str):
    # Return current revenue rates per module (simulated for now)
    # In production, fetch from actual providers
    return {
        "mining": 0.10,  # ₹0.10 per H/s
        "proxy": 0.05,   # ₹0.05 per MB
        "cdn": 0.03,     # ₹0.03 per MB
        "ai": 0.01,      # ₹0.01 per inference
    }