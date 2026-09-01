from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class PolicyRuleDefinition(BaseModel):
    rule_id: str
    name: str
    description: str
    enabled: bool = True
    parameters: Dict[str, Any] = Field(default_factory=dict)

class PolicyVersion(BaseModel):
    id: str
    version: str = "v1.0"
    merchant_id: str = "default_merchant"
    is_active: bool = True
    is_shadow: bool = False
    
    # Core Limits
    max_attempts_per_case: int = 2
    max_active_charge_actions: int = 1
    attribution_window_minutes: int = 60
    case_expiry_hours: int = 72
    
    # Contact Policy
    max_messages_24h: int = 2
    quiet_hours_start: int = 22 # 10 PM
    quiet_hours_end: int = 8   # 8 AM
    opt_out_keywords: List[str] = ["STOP", "UNSUBSCRIBE", "CANCEL", "OPT OUT", "OPTOUT"]
    
    # Autonomy & Risk Controls
    high_value_threshold: float = 10000.0 # INR
    human_review_threshold: float = 25000.0 # INR
    incentive_enabled: bool = False
    automatic_same_rail_retry: bool = False
    max_discount_percentage: float = 0.10
    max_absolute_discount: float = 500.0
    
    # Rail Health Controls
    min_rail_sample_size: int = 30
    rail_degradation_threshold: float = 0.40 # < 40% success rate is degraded
    
    rules: List[PolicyRuleDefinition] = Field(default_factory=list)
    created_at: str
    updated_at: str

class PolicyEvaluationResult(BaseModel):
    verdict: str # "allowed" | "blocked" | "escalate"
    passed_rules: List[str] = Field(default_factory=list)
    violated_rules: List[str] = Field(default_factory=list)
    policy_version: str
    reason: str
