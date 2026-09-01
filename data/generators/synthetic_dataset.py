import random
import uuid
import json
from typing import List, Dict, Any

def generate_synthetic_recovery_dataset(count: int = 5000, seed: int = 42) -> List[Dict[str, Any]]:
    """
    Generates a deterministic synthetic dataset of 5,000 cases per PRD Section 24.
    Composition: 60% Payment Failures, 15% Abandonments, 15% Subscriptions, 10% B2B Receivables.
    """
    random.seed(seed)
    dataset = []

    methods = ["upi", "card", "netbanking", "wallet"]
    issuers = ["hdfc", "sbi", "icici", "axis", "kotak"]
    networks = ["visa", "mastercard", "rupay"]

    failure_reasons_pool = [
        ("ISSUER", "AUTHORIZATION", "issuer_technical_error", "Bank timeout / gateway error", True),
        ("INSTRUMENT", "INITIATION", "card_expired", "Card expired", True),
        ("CUSTOMER", "AUTHORIZATION", "insufficient_funds", "Insufficient balance", True),
        ("BUSINESS", "INITIATION", "risk_check_failed", "Risk policy block", False),
        ("CUSTOMER", "AUTHENTICATION", "otp_timeout", "OTP timeout / user aborted", True),
        ("INSTRUMENT", "INITIATION", "invalid_vpa", "Invalid UPI address", True)
    ]

    for i in range(count):
        case_id = f"sim_case_{i+1:05d}"
        cust_id = f"cust_{random.randint(1000, 9999)}"
        order_id = f"order_{random.randint(100000, 999999)}"
        
        # Determine domain
        r = random.random()
        if r < 0.60:
            domain = "PAYMENT_FAILURE"
        elif r < 0.75:
            domain = "CHECKOUT_ABANDONMENT"
        elif r < 0.90:
            domain = "SUBSCRIPTION_FAILURE"
        else:
            domain = "B2B_RECEIVABLE"

        # Amount distribution (skewed towards ₹500 - ₹15,000)
        amount_inr = random.choices(
            [499, 999, 1499, 2999, 4999, 8999, 14999, 35000],
            weights=[25, 25, 20, 15, 8, 4, 2, 1]
        )[0]
        amount_paise = amount_inr * 100

        method = random.choice(methods)
        issuer = random.choice(issuers)
        network = random.choice(networks) if method == "card" else None
        
        # Failure details
        source, step, code, desc, recoverable = random.choice(failure_reasons_pool)
        
        # Behavioral & Context features
        checkout_progress = random.choice([0.4, 0.7, 0.9, 1.0])
        prev_purchases = random.randint(0, 10)
        prev_success_rate = random.choice([0.0, 0.5, 0.8, 0.95, 1.0])
        session_active = random.random() > 0.3
        opted_out = random.random() < 0.03 # 3% opted out
        time_since_failure_min = random.uniform(0.5, 45.0)
        
        # Rail health condition (simulate 15% degraded periods)
        rail_degraded = (issuer in ["sbi", "hdfc"] and random.random() < 0.18)

        # Simulation hidden outcome generator per candidate action
        # Baseline recovery probability
        base_p = 0.10 if session_active else 0.03
        if not recoverable:
            base_p = 0.0

        simulated_outcomes = {
            "NO_ACTION": random.random() < (0.08 if recoverable else 0.0),
            "STATIC_BASELINE": random.random() < (0.24 if recoverable and not rail_degraded and code != "card_expired" else 0.05),
            "AI_POLICY": random.random() < (0.58 if recoverable and not opted_out else 0.0)
        }

        dataset.append({
            "case_id": case_id,
            "merchant_id": "default_merchant",
            "customer_id": cust_id,
            "order_id": order_id,
            "domain": domain,
            "amount_inr": amount_inr,
            "amount_paise": amount_paise,
            "payment_method": method,
            "issuer_or_rail": issuer,
            "network": network,
            "failure_source": source,
            "failure_step": step,
            "failure_reason": desc,
            "failure_code": code,
            "recoverable": recoverable,
            "checkout_progress": checkout_progress,
            "previous_purchase_count": prev_purchases,
            "previous_payment_success_rate": prev_success_rate,
            "time_since_failure_minutes": round(time_since_failure_min, 1),
            "customer_session_active": session_active,
            "contact_count_24h": 0,
            "opted_out": opted_out,
            "rail_degraded": rail_degraded,
            "simulated_outcomes": simulated_outcomes
        })

    return dataset

if __name__ == "__main__":
    cases = generate_synthetic_recovery_dataset(5000)
    print(f"Generated {len(cases)} synthetic recovery cases successfully.")
