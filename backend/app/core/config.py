import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Revenue Recovery Orchestrator"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./recovery_orchestrator.db"
    
    # Razorpay Test Mode Configuration
    RAZORPAY_KEY_ID: str = "rzp_test_mock_key_id"
    RAZORPAY_KEY_SECRET: str = "rzp_test_mock_key_secret"
    RAZORPAY_WEBHOOK_SECRET: str = "rzp_test_webhook_secret_12345"
    
    # Appendix A - Configuration Contract Defaults
    # RECOVERY
    MAX_ATTEMPTS_PER_CASE: int = 2
    MAX_ACTIVE_CHARGE_ACTIONS: int = 1
    ATTRIBUTION_WINDOW_MINUTES: int = 60
    CASE_EXPIRY_HOURS: int = 72
    
    # CONTACT
    MAX_MESSAGES_24H: int = 2
    QUIET_HOURS_START: int = 22  # 10 PM
    QUIET_HOURS_END: int = 8    # 8 AM
    OPT_OUT_KEYWORDS: List[str] = ["STOP", "UNSUBSCRIBE", "CANCEL", "OPT OUT", "OPTOUT", "DO NOT CONTACT"]
    
    # POLICY
    HIGH_VALUE_THRESHOLD: float = 10000.0  # ₹10,000
    HUMAN_REVIEW_THRESHOLD: float = 25000.0 # ₹25,000
    INCENTIVE_ENABLED: bool = False
    AUTOMATIC_SAME_RAIL_RETRY: bool = False
    MAX_DISCOUNT_PERCENTAGE: float = 0.10 # 10%
    MAX_ABSOLUTE_DISCOUNT: float = 500.0  # ₹500
    
    # RAIL_HEALTH
    MIN_SAMPLE_SIZE: int = 30
    ROLLING_WINDOW_MINUTES: int = 10
    DEGRADATION_THRESHOLD: float = 0.40 # < 40% success rate is degraded
    
    # AI & MODELS
    PRIMARY_LOCAL_MODEL: str = "qwen3:8b"
    FALLBACK_LOCAL_MODEL: str = "gemma3:4b"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    EMBEDDING_MODEL: str = "BAAI/bge-m3"
    RERANKER_ENABLED: bool = True
    
    # DEMO
    ALLOW_TIMER_FAST_FORWARD: bool = True
    ALLOW_SIMULATED_EVENTS: bool = True
    SIMULATED_EVENTS_ARE_LABELED: bool = True
    FAKE_SUCCESS_ALLOWED: bool = False  # NEVER allowed per Appendix B

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
