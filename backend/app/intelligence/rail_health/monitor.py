from enum import Enum
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field

class RailState(str, Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    RECOVERING = "RECOVERING"
    UNKNOWN = "UNKNOWN"

class RailHealthMetric(BaseModel):
    method: str
    issuer: Optional[str] = None
    network: Optional[str] = None
    bank_code: Optional[str] = None
    total_attempts: int = 0
    successful_attempts: int = 0
    failed_attempts: int = 0
    current_success_rate: float = 1.0
    baseline_success_rate: float = 0.95
    state: RailState = RailState.HEALTHY
    is_external_downtime_reported: bool = False
    confidence: float = 1.0
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AdaptiveRailHealthMonitor:
    """
    Adaptive Payment-Rail Health Monitor based on PRD Section 12.
    Tracks success/failure rates across method/issuer/network dimensions with
    sample-size guardrails and baseline deviation analysis.
    """
    
    def __init__(self, min_sample_size: int = 30, degradation_threshold: float = 0.40):
        self.min_sample_size = min_sample_size
        self.degradation_threshold = degradation_threshold
        # Key: "method:issuer:network" -> RailHealthMetric
        self._rails: Dict[str, RailHealthMetric] = {}
        self._initialize_default_rails()
        
    def _get_key(self, method: str, issuer: Optional[str] = None, network: Optional[str] = None) -> str:
        m = (method or "any").lower()
        i = (issuer or "any").lower()
        n = (network or "any").lower()
        return f"{m}:{i}:{n}"

    def _initialize_default_rails(self):
        # Initialize default common Indian rails with healthy baselines
        defaults = [
            ("upi", "sbi", None, 0.94),
            ("upi", "hdfc", None, 0.96),
            ("upi", "icici", None, 0.95),
            ("upi", "axis", None, 0.95),
            ("upi", "any", None, 0.95),
            ("card", "hdfc", "visa", 0.96),
            ("card", "hdfc", "mastercard", 0.95),
            ("card", "sbi", "visa", 0.92),
            ("card", "sbi", "mastercard", 0.91),
            ("card", "icici", "visa", 0.95),
            ("card", "axis", "mastercard", 0.94),
            ("card", "any", "any", 0.94),
            ("netbanking", "hdfc", None, 0.93),
            ("netbanking", "sbi", None, 0.90),
            ("netbanking", "icici", None, 0.94),
            ("netbanking", "axis", None, 0.92),
        ]
        for m, i, n, baseline in defaults:
            key = self._get_key(m, i, n)
            self._rails[key] = RailHealthMetric(
                method=m,
                issuer=i,
                network=n,
                total_attempts=50,
                successful_attempts=int(50 * baseline),
                failed_attempts=50 - int(50 * baseline),
                current_success_rate=baseline,
                baseline_success_rate=baseline,
                state=RailState.HEALTHY,
                confidence=0.95
            )

    def record_attempt(self, method: str, issuer: Optional[str], network: Optional[str], is_success: bool):
        key = self._get_key(method, issuer, network)
        if key not in self._rails:
            self._rails[key] = RailHealthMetric(
                method=method,
                issuer=issuer,
                network=network,
                total_attempts=0,
                successful_attempts=0,
                failed_attempts=0,
                current_success_rate=0.95,
                baseline_success_rate=0.95,
                state=RailState.UNKNOWN,
                confidence=0.5
            )
            
        metric = self._rails[key]
        metric.total_attempts += 1
        if is_success:
            metric.successful_attempts += 1
        else:
            metric.failed_attempts += 1
            
        metric.current_success_rate = metric.successful_attempts / max(1, metric.total_attempts)
        metric.last_updated = datetime.now(timezone.utc).isoformat()
        
        # State determination with guardrails
        self._update_rail_state(metric)

    def inject_degradation_spike(self, method: str, issuer: Optional[str] = None, network: Optional[str] = None):
        """Used in Failure Injection & Demo scenarios to simulate bank downtime"""
        key = self._get_key(method, issuer, network)
        if key not in self._rails:
            self._rails[key] = RailHealthMetric(
                method=method, issuer=issuer, network=network,
                total_attempts=40, successful_attempts=4, failed_attempts=36,
                current_success_rate=0.10, baseline_success_rate=0.95,
                state=RailState.DEGRADED, is_external_downtime_reported=True
            )
        else:
            metric = self._rails[key]
            metric.total_attempts = 40
            metric.successful_attempts = 4
            metric.failed_attempts = 36
            metric.current_success_rate = 0.10
            metric.state = RailState.DEGRADED
            metric.is_external_downtime_reported = True
            metric.last_updated = datetime.now(timezone.utc).isoformat()

    def restore_rail(self, method: str, issuer: Optional[str] = None, network: Optional[str] = None):
        key = self._get_key(method, issuer, network)
        if key in self._rails:
            metric = self._rails[key]
            metric.total_attempts = 50
            metric.successful_attempts = 48
            metric.failed_attempts = 2
            metric.current_success_rate = 0.96
            metric.state = RailState.HEALTHY
            metric.is_external_downtime_reported = False
            metric.last_updated = datetime.now(timezone.utc).isoformat()

    def _update_rail_state(self, metric: RailHealthMetric):
        if metric.is_external_downtime_reported:
            metric.state = RailState.DEGRADED
            return
            
        if metric.total_attempts < self.min_sample_size:
            # Guardrail: Do not declare degradation from a tiny sample alone
            if metric.current_success_rate < 0.20 and metric.total_attempts >= 10:
                metric.state = RailState.DEGRADED
            else:
                metric.state = RailState.HEALTHY if metric.current_success_rate >= 0.70 else RailState.UNKNOWN
            return

        if metric.current_success_rate < self.degradation_threshold:
            metric.state = RailState.DEGRADED
        elif metric.current_success_rate < (metric.baseline_success_rate - 0.20):
            metric.state = RailState.RECOVERING
        else:
            metric.state = RailState.HEALTHY

    def get_rail_health(self, method: str, issuer: Optional[str] = None, network: Optional[str] = None) -> RailHealthMetric:
        # Check specific rail first
        key = self._get_key(method, issuer, network)
        if key in self._rails:
            return self._rails[key]
            
        # Fallback to method+issuer
        key_mi = self._get_key(method, issuer, None)
        if key_mi in self._rails:
            return self._rails[key_mi]
            
        # Fallback to method-level
        key_m = self._get_key(method, None, None)
        if key_m in self._rails:
            return self._rails[key_m]
            
        # Default healthy fallback
        return RailHealthMetric(
            method=method,
            issuer=issuer,
            network=network,
            state=RailState.HEALTHY,
            current_success_rate=0.95,
            baseline_success_rate=0.95
        )

    def is_degraded(self, method: str, issuer: Optional[str] = None, network: Optional[str] = None) -> bool:
        health = self.get_rail_health(method, issuer, network)
        return health.state == RailState.DEGRADED

    def list_all_rails(self) -> List[RailHealthMetric]:
        return list(self._rails.values())

# Global singleton monitor
rail_health_monitor = AdaptiveRailHealthMonitor()
