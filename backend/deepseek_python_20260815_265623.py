import os
import json
import requests
from supabase import create_client, Client
from datetime import datetime, timedelta
import time
import firebase_admin
from firebase_admin import credentials, messaging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel  # <-- FIXED: added BaseModel
from typing import Optional

# ---------- ENV ----------
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")
GOOGLE_CREDENTIALS_JSON = os.environ.get("GOOGLE_CREDENTIALS_JSON")

# ---------- INIT ----------
if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
else:
    supabase = None

if GOOGLE_CREDENTIALS_JSON:
    try:
        cred = credentials.Certificate(json.loads(GOOGLE_CREDENTIALS_JSON))
        firebase_admin.initialize_app(cred)
    except:
        pass

app = FastAPI(title="MinePulse API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- MODELS ----------
class MiningHeartbeat(BaseModel):
    user_id: str
    session_id: str
    hashrate: float
    shares: int
    rejected: int

class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    payout_method: str = "UPI"
    wallet_address: str

class UserLogin(BaseModel):
    email: str
    password: str

class WalletUpdate(BaseModel):
    wallet_address: str
    payout_method: str

class PayoutRequest(BaseModel):
    user_id: str
    amount: float
    method: str

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

# ---------- HELPERS ----------
def send_telegram(message):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={'chat_id': TELEGRAM_CHAT_ID, 'text': message, 'parse_mode': 'HTML'},
            timeout=10
        )
    except:
        pass

# ---------- HEALTH ----------
@app.get("/")
def root():
    return {"message": "MinePulse API is running", "status": "ok"}

@app.get("/health")
def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ---------- AUTH ----------
@app.post("/api/auth/register")
def register(user: UserRegister):
    if not supabase:
        return {"user_id": "mock-123", "username": user.username, "message": "Registered (mock)"}
    try:
        data = {
            "username": user.username,
            "email": user.email,
            "password_hash": user.password,
            "payout_method": user.payout_method,
            "wallet_address": user.wallet_address,
            "created_at": datetime.utcnow().isoformat()
        }
        result = supabase.table("users").insert(data).execute()
        return {"user_id": result.data[0]["id"], "username": user.username, "message": "Registered successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login")
def login(user: UserLogin):
    if not supabase:
        return {"user_id": "mock-123", "username": user.email.split("@")[0], "message": "Login (mock)"}
    try:
        result = supabase.table("users").select("*").eq("email", user.email).execute()
        if not result.data:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return {"user_id": result.data[0]["id"], "username": result.data[0]["username"], "message": "Login successful"}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

# ---------- MINING ----------
@app.post("/api/mining/heartbeat")
def heartbeat(heartbeat: MiningHeartbeat):
    if not supabase:
        return {"status": "ok", "message": "Heartbeat received (mock)"}
    try:
        data = {
            "user_id": heartbeat.user_id,
            "hashrate": heartbeat.hashrate,
            "shares": heartbeat.shares,
            "rejected": heartbeat.rejected,
            "session_id": heartbeat.session_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        supabase.table("mining_stats").insert(data).execute()
        # Calculate earnings: hashrate * 0.0001 per second (simplified)
        earnings_amount = heartbeat.hashrate * 0.0001
        supabase.table("earnings").insert({
            "user_id": heartbeat.user_id,
            "amount": earnings_amount,
            "type": "mining",
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        return {"status": "ok", "message": "Heartbeat recorded"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/mining/status")
def mining_status(user_id: str):
    if not supabase:
        return {"status": "active", "hashrate": 25.4, "earnings": 12.50}
    try:
        result = supabase.table("mining_stats").select("*").eq("user_id", user_id).order("timestamp", desc=True).limit(1).execute()
        if result.data:
            return {"status": "active", "hashrate": result.data[0]["hashrate"], "earnings": 0}
        return {"status": "inactive", "hashrate": 0, "earnings": 0}
    except:
        return {"status": "inactive", "hashrate": 0, "earnings": 0}

# ---------- EARNINGS ----------
@app.get("/api/earnings/today")
def earnings_today(user_id: str):
    if not supabase:
        return {"amount": 12.50, "currency": "INR"}
    try:
        today = datetime.utcnow().date().isoformat()
        result = supabase.table("earnings").select("amount").eq("user_id", user_id).gte("created_at", today).execute()
        total = sum(item["amount"] for item in result.data) if result.data else 0
        return {"amount": round(total, 2), "currency": "INR"}
    except:
        return {"amount": 0, "currency": "INR"}

@app.get("/api/earnings/week")
def earnings_week(user_id: str):
    if not supabase:
        return {"amount": 87.20, "currency": "INR"}
    try:
        week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        result = supabase.table("earnings").select("amount").eq("user_id", user_id).gte("created_at", week_ago).execute()
        total = sum(item["amount"] for item in result.data) if result.data else 0
        return {"amount": round(total, 2), "currency": "INR"}
    except:
        return {"amount": 0, "currency": "INR"}

@app.get("/api/earnings/month")
def earnings_month(user_id: str):
    if not supabase:
        return {"amount": 345.80, "currency": "INR"}
    try:
        month_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
        result = supabase.table("earnings").select("amount").eq("user_id", user_id).gte("created_at", month_ago).execute()
        total = sum(item["amount"] for item in result.data) if result.data else 0
        return {"amount": round(total, 2), "currency": "INR"}
    except:
        return {"amount": 0, "currency": "INR"}

@app.get("/api/earnings/lifetime")
def earnings_lifetime(user_id: str):
    if not supabase:
        return {"amount": 1234.56, "currency": "INR"}
    try:
        result = supabase.table("earnings").select("amount").eq("user_id", user_id).execute()
        total = sum(item["amount"] for item in result.data) if result.data else 0
        return {"amount": round(total, 2), "currency": "INR"}
    except:
        return {"amount": 0, "currency": "INR"}

@app.get("/api/earnings/history")
def earnings_history(user_id: str, limit: int = 10):
    if not supabase:
        history = []
        for i in range(limit):
            date = (datetime.utcnow() - timedelta(days=i)).date().isoformat()
            history.append({"date": date, "amount": round(10 + i * 2.5, 2)})
        return {"history": history}
    try:
        result = supabase.table("earnings").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        history = []
        for row in result.data:
            history.append({"date": row["created_at"].split("T")[0], "amount": row["amount"]})
        return {"history": history}
    except:
        return {"history": []}

# ---------- WALLET ----------
@app.get("/api/wallet/balance")
def wallet_balance(user_id: str):
    if not supabase:
        return {"available": 345.80, "pending": 12.50, "minimum": 100.00}
    try:
        result = supabase.table("earnings").select("amount").eq("user_id", user_id).eq("status", "pending").execute()
        pending = sum(item["amount"] for item in result.data) if result.data else 0
        result2 = supabase.table("earnings").select("amount").eq("user_id", user_id).eq("status", "confirmed").execute()
        confirmed = sum(item["amount"] for item in result2.data) if result2.data else 0
        return {"available": round(confirmed, 2), "pending": round(pending, 2), "minimum": 100.00}
    except:
        return {"available": 0, "pending": 0, "minimum": 100.00}

@app.post("/api/wallet/update")
def wallet_update(user_id: str, wallet: WalletUpdate):
    if not supabase:
        return {"status": "ok", "message": "Wallet updated (mock)"}
    try:
        supabase.table("users").update({
            "wallet_address": wallet.wallet_address,
            "payout_method": wallet.payout_method
        }).eq("id", user_id).execute()
        return {"status": "ok", "message": "Wallet updated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ---------- PAYOUTS ----------
@app.post("/api/payout/request")
def payout_request(payout: PayoutRequest):
    if payout.amount < 100:
        raise HTTPException(status_code=400, detail="Minimum payout is ₹100")
    if not supabase:
        return {"status": "pending", "payout_id": "mock-123", "amount": payout.amount, "method": payout.method, "message": "Payout requested"}
    try:
        data = {
            "user_id": payout.user_id,
            "amount": payout.amount,
            "method": payout.method,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        }
        result = supabase.table("payouts").insert(data).execute()
        return {"status": "pending", "payout_id": result.data[0]["id"], "amount": payout.amount, "method": payout.method, "message": "Payout requested"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/payout/history")
def payout_history(user_id: str):
    if not supabase:
        return {"history": [{"date": "2026-08-11", "amount": 490.00, "status": "Completed", "method": "UPI"}]}
    try:
        result = supabase.table("payouts").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        history = []
        for row in result.data:
            history.append({
                "date": row["created_at"].split("T")[0],
                "amount": row["amount"],
                "status": row["status"],
                "method": row["method"]
            })
        return {"history": history}
    except:
        return {"history": []}

# ---------- CHIMERA MODULES ----------
@app.post("/api/proxy/stats")
def proxy_stats(stats: ProxyStats):
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
def cdn_stats(stats: CDNStats):
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
def ai_stats(stats: AIStats):
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
def routing_rates(user_id: str):
    # Return current revenue rates per module (simulated)
    return {
        "mining": 0.10,
        "proxy": 0.05,
        "cdn": 0.03,
        "ai": 0.01,
    }

# ---------- RESOURCES ----------
@app.get("/api/resources")
def get_resources():
    return [
        {"id": 1, "name": "SupportXMR", "description": "Monero pool", "url": "https://supportxmr.com"},
        {"id": 2, "name": "MineXMR", "description": "Monero pool", "url": "https://minexmr.com"},
        {"id": 3, "name": "MyMonero", "description": "Wallet", "url": "https://mymonero.com"},
        {"id": 4, "name": "Cake Wallet", "description": "Mobile wallet", "url": "https://cakewallet.com"},
        {"id": 5, "name": "CoinGecko", "description": "Price data", "url": "https://coingecko.com/coins/monero"},
    ]

# ---------- NOTIFICATIONS ----------
@app.get("/api/notifications")
def get_notifications(user_id: str, limit: int = 10):
    return {
        "notifications": [
            {"id": 1, "title": "Welcome to MinePulse", "body": "Start mining to earn daily rewards.", "read": False, "time": datetime.utcnow().isoformat()},
            {"id": 2, "title": "Mining Started", "body": "Your mining session is active.", "read": True, "time": (datetime.utcnow() - timedelta(hours=1)).isoformat()},
        ]
    }