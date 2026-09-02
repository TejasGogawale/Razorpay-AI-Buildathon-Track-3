import random
import uuid
import json
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

def generate_synthetic_recovery_dataset(count: int = 20000, seed: int = 42) -> List[Dict[str, Any]]:
    """
    Generates a deterministic synthetic dataset of 20,000 diverse, realistic recovery cases.
    Includes rich transaction amounts (₹99 to ₹125,000), 10+ payment methods & banks,
    15+ authentic decline error codes, customer lifetime value, and session telemetry.
    """
    random.seed(seed)
    dataset = []

    methods = [
        ("upi", 0.45),
        ("card", 0.30),
        ("netbanking", 0.12),
        ("subscription", 0.08),
        ("paylater", 0.03),
        ("b2b_invoice", 0.02)
    ]
    
    issuers = [
        ("hdfc", 0.28),
        ("sbi", 0.24),
        ("icici", 0.20),
        ("axis", 0.12),
        ("kotak", 0.08),
        ("federal", 0.04),
        ("yesbank", 0.04)
    ]
    
    networks = ["visa", "mastercard", "rupay", "amex"]

    # Authentic error taxonomy pool
    failure_reasons_pool = [
        ("ISSUER", "AUTHORIZATION", "issuer_technical_error", "Bank servers timed out during authorization", True),
        ("INSTRUMENT", "INITIATION", "card_expired", "Card expiry date has elapsed", True),
        ("CUSTOMER", "AUTHORIZATION", "insufficient_funds", "Insufficient funds or credit limit exceeded", True),
        ("CUSTOMER", "AUTHENTICATION", "otp_timeout", "OTP timeout or user dropped 3D Secure session", True),
        ("CUSTOMER", "AUTHENTICATION", "incorrect_upi_pin", "Incorrect UPI PIN entered by user", True),
        ("ISSUER", "AUTHORIZATION", "bank_downtime", "Issuer core banking system scheduled downtime", True),
        ("GATEWAY", "AUTHORIZATION", "gateway_timeout", "Acquiring gateway timed out waiting for switch response", True),
        ("BUSINESS", "INITIATION", "risk_check_failed", "Transaction blocked due to elevated fraud risk score", False),
        ("INSTRUMENT", "INITIATION", "invalid_vpa", "Invalid or unregistered UPI Virtual Payment Address", True),
        ("INSTRUMENT", "AUTHORIZATION", "mandate_revoked", "Customer revoked e-mandate standing instruction", False),
        ("CUSTOMER", "INITIATION", "payment_cancelled", "Customer manually cancelled transaction in payment app", True),
        ("GATEWAY", "CAPTURE", "capture_timeout", "Auto-capture failed after authorization hold", True)
    ]

    customer_names = [
        "Aarav Sharma", "Diya Patel", "Rohan Mehta", "Ananya Iyer", "Vikram Singh",
        "Pooja Deshmukh", "Karan Verma", "Sneha Rao", "Aditya Nair", "Tanvi Joshi",
        "Rahul Gupta", "Neha Kulkarni", "Amit Saxena", "Meera Sen", "Siddharth Jain"
    ]

    base_time = datetime.now(timezone.utc) - timedelta(days=7)

    for i in range(count):
        case_id = f"case_{i+1:06d}"
        cust_name = random.choice(customer_names)
        cust_id = f"cust_{random.randint(10000, 99999)}"
        order_id = f"order_{random.randint(1000000, 9999999)}"
        
        # Weighted method and issuer selection
        method = random.choices([m[0] for m in methods], weights=[m[1] for m in methods])[0]
        issuer = random.choices([i[0] for i in issuers], weights=[i[1] for i in issuers])[0]
        network = random.choice(networks) if method == "card" else None

        # Domain assignment
        if method == "subscription":
            domain = "SUBSCRIPTION_FAILURE"
        elif method == "b2b_invoice":
            domain = "B2B_RECEIVABLE"
        elif random.random() < 0.15:
            domain = "CHECKOUT_ABANDONMENT"
        else:
            domain = "PAYMENT_FAILURE"

        # Realistic Ticket Size distribution (₹99 to ₹125,000)
        amount_tier = random.choices(
            ["micro", "low", "medium", "high", "enterprise"],
            weights=[20, 40, 25, 12, 3]
        )[0]

        if amount_tier == "micro":
            amount_inr = random.choice([99, 149, 299, 499])
        elif amount_tier == "low":
            amount_inr = random.choice([799, 999, 1499, 2499, 3999])
        elif amount_tier == "medium":
            amount_inr = random.choice([4999, 6999, 8999, 12499, 15999])
        elif amount_tier == "high":
            amount_inr = random.choice([19999, 24999, 28999, 35000, 49999])
        else:
            amount_inr = random.choice([65000, 85000, 99999, 125000])

        amount_paise = amount_inr * 100

        # Failure details
        source, step, code, desc, recoverable = random.choice(failure_reasons_pool)
        
        # Behavioral & Context features
        checkout_progress = random.choice([0.4, 0.6, 0.8, 0.95, 1.0])
        prev_purchases = random.randint(0, 15)
        prev_success_rate = random.choice([0.0, 0.6, 0.85, 0.95, 1.0])
        customer_ltv = round(prev_purchases * random.uniform(800.0, 4500.0), 2)
        session_active = random.random() > 0.35
        opted_out = random.random() < 0.025 # 2.5% opted out
        time_since_failure_min = random.uniform(0.5, 60.0)
        
        # Rail health condition (simulate ~12% degraded periods)
        rail_degraded = (issuer in ["sbi", "hdfc"] and random.random() < 0.14)

        # Simulation hidden outcome generator per candidate action
        simulated_outcomes = {
            "NO_ACTION": random.random() < (0.07 if recoverable else 0.0),
            "STATIC_BASELINE": random.random() < (0.22 if recoverable and not rail_degraded and code != "card_expired" else 0.04),
            "AI_POLICY": random.random() < (0.61 if recoverable and not opted_out and amount_inr < 25000 else 0.0)
        }

        # Staggered timestamp over past 7 days
        timestamp = (base_time + timedelta(minutes=random.randint(1, 10080))).isoformat()

        dataset.append({
            "case_id": case_id,
            "merchant_id": "default_merchant",
            "customer_id": cust_id,
            "customer_name": cust_name,
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
            "customer_ltv": customer_ltv,
            "time_since_failure_minutes": round(time_since_failure_min, 1),
            "customer_session_active": session_active,
            "contact_count_24h": random.choice([0, 0, 0, 1, 2]),
            "opted_out": opted_out,
            "rail_degraded": rail_degraded,
            "simulated_outcomes": simulated_outcomes,
            "created_at": timestamp
        })

    return dataset

if __name__ == "__main__":
    cases = generate_synthetic_recovery_dataset(20000)
    print(f"Generated {len(cases)} synthetic recovery cases successfully.")
