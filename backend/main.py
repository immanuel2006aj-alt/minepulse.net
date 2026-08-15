import os
import uuid
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel
from typing import Optional

# ---------- ENV ----------
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

# ---------- INIT ----------
app = FastAPI(title="MinePulse API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- SUPABASE ----------
if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("⚠️ Supabase environment variables not set. Using mock data.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY) if SUPABASE_URL and SUPABASE_SERVICE_KEY else None

# ---------- MODELS ----------
class MiningHeartbeat(BaseModel):
    user_id: str
    hashrate: float
    shares: int
    rejected: int
    session_id: str

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
        return {"user_id": str(uuid.uuid4()), "username": user.username, "message": "Registered (mock)"}
    try:
        data = {
            "username": user.username,
            "email": user.email,
            "password_hash": user.password,  # In production, hash this
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
        return {"user_id": str(uuid.uuid4()), "username": user.email.split("@")[0], "message": "Login (mock)"}
    try:
        result = supabase.table("users").select("*").eq("email", user.email).execute()
        if not result.data:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        # In production, verify password hash
        return {"user_id": result.data[0]["id"], "username": result.data[0]["username"], "message": "Login successful"}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

# ---------- MINING ----------
@app.post("/api/mining/heartbeat")
def heartbeat(heartbeat: MiningHeartbeat):
    # Store mining stats in Supabase
    if not supabase:
        return {"status": "ok", "message": "Heartbeat received (mock)"}
    try:
        # 1. Insert into mining_stats
        data = {
            "user_id": heartbeat.user_id,
            "hashrate": heartbeat.hashrate,
            "shares": heartbeat.shares,
            "rejected": heartbeat.rejected,
            "session_id": heartbeat.session_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        supabase.table("mining_stats").insert(data).execute()

        # 2. Calculate earnings for this heartbeat
        # Simple formula: earnings = hashrate * 0.0001 per second (simplified)
        # In production, you would use actual mining pool data
        earnings_amount = heartbeat.hashrate * 0.0001

        # 3. Insert into earnings table
        earnings_data = {
            "user_id": heartbeat.user_id,
            "amount": earnings_amount,
            "type": "mining",
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        }
        supabase.table("earnings").insert(earnings_data).execute()

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
    except Exception:
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
    except Exception:
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
    except Exception:
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
    except Exception:
        return {"amount": 0, "currency": "INR"}

@app.get("/api/earnings/lifetime")
def earnings_lifetime(user_id: str):
    if not supabase:
        return {"amount": 1234.56, "currency": "INR"}
    try:
        result = supabase.table("earnings").select("amount").eq("user_id", user_id).execute()
        total = sum(item["amount"] for item in result.data) if result.data else 0
        return {"amount": round(total, 2), "currency": "INR"}
    except Exception:
        return {"amount": 0, "currency": "INR"}

# ---------- WALLET ----------
@app.get("/api/wallet/balance")
def wallet_balance(user_id: str):
    return {"available": 345.80, "pending": 12.50, "minimum": 100.00}

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
    # Mock payout
    return {
        "status": "pending",
        "payout_id": str(uuid.uuid4()),
        "amount": payout.amount,
        "method": payout.method,
        "message": "Payout requested. Processing within 24-48 hours."
    }

@app.get("/api/payout/history")
def payout_history(user_id: str):
    # Mock history
    history = [
        {"date": "2026-08-11", "amount": 490.00, "status": "Completed", "method": "UPI"},
        {"date": "2026-08-04", "amount": 490.00, "status": "Completed", "method": "UPI"},
    ]
    return {"history": history}

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
