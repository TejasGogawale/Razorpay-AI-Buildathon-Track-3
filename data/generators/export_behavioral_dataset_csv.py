import os
import sys
import csv
import json
import random
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

# Ensure repository root is on sys.path
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from data.generators.synthetic_dataset import generate_synthetic_recovery_dataset
from backend.app.intelligence.ml.recovery_predictor import ml_predictor

OUTPUT_CSV_PATH = os.path.join(REPO_ROOT, "data", "customer_recovery_and_behavioral_dataset.csv")

def analyze_customer_psychology_and_behavior(row: Dict[str, Any], rng: random.Random) -> Dict[str, Any]:
    """
    Simulates the model's analytical profiling of customer psychological behavioral patterns,
    including checkout abandonment history, hesitation dwell times, security anxiety,
    and tailored behavioral recovery interventions.
    """
    amount = row["amount_inr"]
    prev_purchases = row["previous_purchase_count"]
    prev_success_rate = row["previous_payment_success_rate"]
    ltv = row["customer_ltv"]
    progress = row["checkout_progress"]
    fail_code = row["failure_code"]
    method = row["payment_method"]
    opted_out = row["opted_out"]
    session_active = row["customer_session_active"]

    # 1. Historical Checkout Abandonment Analytics
    # Customers with low purchase history or low progress show higher historical cart/checkout drops
    if prev_purchases == 0:
        abandonment_count = rng.choices([1, 2, 3, 4, 5, 6], weights=[15, 25, 25, 15, 10, 10])[0]
    elif prev_purchases < 3:
        abandonment_count = rng.choices([0, 1, 2, 3, 4], weights=[25, 35, 20, 15, 5])[0]
    elif prev_purchases < 7:
        abandonment_count = rng.choices([0, 1, 2], weights=[55, 35, 10])[0]
    else:
        abandonment_count = rng.choices([0, 1], weights=[85, 15])[0]

    # Checkout abandonment propensity & frequent abandoner classification
    frequently_abandons = abandonment_count >= 3 or (abandonment_count >= 2 and prev_purchases <= 1)
    abandonment_risk_score = round(min(0.98, max(0.05, (abandonment_count * 0.14) + (1.0 - progress) * 0.35 + (0.1 if not session_active else 0.0))), 3)

    # Primary Abandonment Trigger & Stage Affinity
    if fail_code == "otp_timeout":
        abandonment_trigger = "payment_friction_otp_timeout"
        dropoff_stage = "otp_authentication_gateway"
    elif fail_code == "insufficient_funds":
        abandonment_trigger = "unexpected_amount_or_liquidity"
        dropoff_stage = "authorization_processing"
    elif fail_code in ["card_expired", "invalid_vpa"]:
        abandonment_trigger = "instrument_input_error"
        dropoff_stage = "payment_method_input"
    elif amount > 25000 and progress < 0.7:
        abandonment_trigger = "price_shock_at_shipping_or_taxes"
        dropoff_stage = "cart_checkout_review"
    elif progress <= 0.6:
        abandonment_trigger = "window_shopping_comparison"
        dropoff_stage = "payment_selection"
    elif not session_active:
        abandonment_trigger = "session_distraction_and_timeout"
        dropoff_stage = "gateway_redirection"
    else:
        abandonment_trigger = "bank_technical_glitch"
        dropoff_stage = "bank_authorization_handshake"

    # 2. Customer Psychological Archetype
    if ltv > 12000 and prev_purchases >= 4:
        archetype = "Loyal Repeat Buyer"
        hesitation_dwell_seconds = rng.randint(8, 25)
        security_anxiety = round(rng.uniform(0.05, 0.25), 2)
        price_sensitivity = round(rng.uniform(0.10, 0.35), 2)
        discount_responsiveness = "Low"
        trust_score = round(rng.uniform(0.85, 0.99), 2)
        psychological_summary = "High trust VIP customer with habitual checkout behavior. Drops are almost purely technical; responds immediately to standard payment links without extra incentive."
    elif fail_code in ["otp_timeout", "bank_downtime", "issuer_technical_error"] and progress >= 0.8:
        archetype = "Anxious & Security Conscious"
        hesitation_dwell_seconds = rng.randint(75, 210)
        security_anxiety = round(rng.uniform(0.65, 0.95), 2)
        price_sensitivity = round(rng.uniform(0.30, 0.60), 2)
        discount_responsiveness = "Moderate"
        trust_score = round(rng.uniform(0.40, 0.65), 2)
        psychological_summary = "High fear of double-debit and OTP fraud. Prolonged screen hesitation. Requires explicit reassurance that account has not been debited and card details remain secure."
    elif method == "upi" and session_active:
        archetype = "Friction-Averse 1-Tap Speed"
        hesitation_dwell_seconds = rng.randint(5, 18)
        security_anxiety = round(rng.uniform(0.15, 0.40), 2)
        price_sensitivity = round(rng.uniform(0.35, 0.65), 2)
        discount_responsiveness = "Moderate"
        trust_score = round(rng.uniform(0.60, 0.85), 2)
        psychological_summary = "Impatience-driven modern digital shopper. Expects zero latency; will abandon instantly if redirected through clumsy screens. Converts best via 1-tap WhatsApp UPI intent."
    elif frequently_abandons and amount < 5000:
        archetype = "Chronic Deal Hunter"
        hesitation_dwell_seconds = rng.randint(45, 150)
        security_anxiety = round(rng.uniform(0.20, 0.50), 2)
        price_sensitivity = round(rng.uniform(0.75, 0.98), 2)
        discount_responsiveness = "High"
        trust_score = round(rng.uniform(0.45, 0.70), 2)
        psychological_summary = "Comparison shopper seeking coupons and maximum value. High cart abandonment rate. Highly responsive to small bounded 5% recovery incentives or cashbacks."
    elif prev_purchases == 0:
        archetype = "First-Time Skeptical"
        hesitation_dwell_seconds = rng.randint(60, 180)
        security_anxiety = round(rng.uniform(0.60, 0.90), 2)
        price_sensitivity = round(rng.uniform(0.50, 0.80), 2)
        discount_responsiveness = "Moderate"
        trust_score = round(rng.uniform(0.20, 0.45), 2)
        psychological_summary = "Unfamiliar with merchant checkout. Skeptical of payment gateway reliability; needs reserved-order comfort and clear Razorpay trust marks."
    else:
        archetype = "Window Shopper Abandoner"
        hesitation_dwell_seconds = rng.randint(30, 90)
        security_anxiety = round(rng.uniform(0.30, 0.60), 2)
        price_sensitivity = round(rng.uniform(0.60, 0.85), 2)
        discount_responsiveness = "High"
        trust_score = round(rng.uniform(0.40, 0.65), 2)
        psychological_summary = "Casual browser with low purchase urgency. Frequently initiates checkout to check final landed price; needs scarcity nudges or stock-hold reservation alerts."

    # 3. Channel & Device Affinity
    channel_affinity = rng.choices(["WhatsApp", "SMS", "In-App Push", "Email"], weights=[50, 25, 20, 5])[0]
    device_category = rng.choices(["Android App", "iOS App", "Mobile Chrome", "Desktop Web"], weights=[55, 25, 15, 5])[0]

    # 4. Optimal Psychology-Aligned Nudge Intervention
    if opted_out:
        optimal_nudge = "DO_NOT_CONTACT_DND_GUARD"
    elif archetype == "Anxious & Security Conscious":
        optimal_nudge = "Reassure No-Debit & Reserve Cart Items (Bilingual Hinglish Voice)"
    elif archetype == "Friction-Averse 1-Tap Speed":
        optimal_nudge = "Instant 1-Tap WhatsApp UPI Intent Deep-Link"
    elif archetype == "Chronic Deal Hunter":
        optimal_nudge = "Bounded 5% Recovery Incentive & Stock Hold Countdown"
    elif archetype == "First-Time Skeptical":
        optimal_nudge = "Display Razorpay Verified Trust Badge & 24h Order Reservation"
    elif archetype == "Loyal Repeat Buyer":
        optimal_nudge = "Frictionless Priority Alternate Payment Link"
    else:
        optimal_nudge = "Standard Multi-Rail Payment Link with Push Reminder"

    return {
        "historical_checkout_abandonment_count": abandonment_count,
        "frequently_abandons_checkout": frequently_abandons,
        "checkout_abandonment_risk_score": abandonment_risk_score,
        "primary_abandonment_trigger": abandonment_trigger,
        "dropoff_stage_affinity": dropoff_stage,
        "customer_psychology_archetype": archetype,
        "hesitation_dwell_time_seconds": hesitation_dwell_seconds,
        "security_anxiety_index": security_anxiety,
        "price_sensitivity_index": price_sensitivity,
        "discount_responsiveness": discount_responsiveness,
        "brand_trust_score": trust_score,
        "device_category": device_category,
        "preferred_recovery_channel": channel_affinity,
        "optimal_psychology_nudge": optimal_nudge,
        "model_psychological_diagnosis": psychological_summary
    }

def export_enriched_dataset(count: int = 20000, seed: int = 42):
    print(f"Generating base synthetic dataset of {count} cases (seed={seed})...")
    base_data = generate_synthetic_recovery_dataset(count=count, seed=seed)
    rng = random.Random(seed)

    print("Executing Vectorized Machine Learning inferences via trained RandomForest...")
    num_features = np.array([[
        r["amount_inr"],
        r["checkout_progress"],
        r["previous_purchase_count"],
        r["previous_payment_success_rate"],
        r["customer_ltv"],
        r["time_since_failure_minutes"],
        r["contact_count_24h"],
        1.0 if r["customer_session_active"] else 0.0,
        1.0 if r["rail_degraded"] else 0.0,
        1.0 if r["opted_out"] else 0.0
    ] for r in base_data])

    cat_features = [[
        r["payment_method"],
        r["issuer_or_rail"],
        r["failure_code"],
        r["domain"]
    ] for r in base_data]

    X_num_scaled = ml_predictor.scaler.transform(num_features)
    X_cat_encoded = ml_predictor.encoder.transform(cat_features)
    X = np.hstack([X_num_scaled, X_cat_encoded])
    all_ml_probs = ml_predictor.model.predict_proba(X)[:, 1]

    print("Analyzing Customer Psychological Behavioral Patterns and Cart Abandonment Propensity...")
    enriched_rows = []

    for idx, row in enumerate(base_data):
        ml_prob = round(float(all_ml_probs[idx]), 4)

        # Algorithmic Customer Intent Scoring
        progress = row["checkout_progress"]
        intent_score = float(
            25 +
            (15 if progress >= 0.6 else 0) +
            (15 if progress >= 0.8 else 0) +
            (10 if row["previous_purchase_count"] > 0 else 0) +
            10 + # cart activity
            (10 if row["previous_payment_success_rate"] >= 0.7 else 0) +
            (10 if row["customer_session_active"] else 0) +
            (5 if row["previous_purchase_count"] > 2 else 0)
        )
        norm_intent = intent_score / 100.0

        # Action and ERV calculation
        if row["opted_out"] or not row["recoverable"]:
            recommended_action = "STOP"
            erv = 0.0
        elif row["rail_degraded"] or row["failure_code"] in ["card_expired", "invalid_vpa"]:
            recommended_action = "STANDARD_PAYMENT_LINK"
            p_link = 0.85 * norm_intent
            erv = round(max(0.0, (row["amount_inr"] * p_link) - 2.0), 2)
        else:
            recommended_action = "CUSTOMER_RETRY" if row["customer_session_active"] else "STANDARD_PAYMENT_LINK"
            p_action = 0.75 * norm_intent
            erv = round(max(0.0, (row["amount_inr"] * p_action) - 1.5), 2)

        # Behavioral & Psychology Analytics
        psychology = analyze_customer_psychology_and_behavior(row, rng)

        combined_row = {
            # Core Identifiers
            "case_id": row["case_id"],
            "created_at": row["created_at"],
            "customer_id": row["customer_id"],
            "customer_name": row["customer_name"],
            "order_id": row["order_id"],
            "domain": row["domain"],
            "amount_inr": row["amount_inr"],
            "payment_method": row["payment_method"],
            "issuer_or_rail": row["issuer_or_rail"],
            "card_network": row["network"] or "N/A",

            # Failure Taxonomy
            "failure_source": row["failure_source"],
            "failure_step": row["failure_step"],
            "failure_code": row["failure_code"],
            "failure_reason": row["failure_reason"],
            "is_recoverable": row["recoverable"],
            "is_rail_degraded": row["rail_degraded"],

            # Customer Engagement & Lifetime Metrics
            "previous_purchase_count": row["previous_purchase_count"],
            "previous_payment_success_rate": row["previous_payment_success_rate"],
            "customer_ltv_inr": row["customer_ltv"],
            "checkout_funnel_progress": row["checkout_progress"],
            "customer_session_active": row["customer_session_active"],
            "time_since_failure_minutes": row["time_since_failure_minutes"],
            "contact_count_24h": row["contact_count_24h"],
            "opted_out_dnd": row["opted_out"],

            # --- CUSTOMER PSYCHOLOGY & CHECKOUT ABANDONMENT SECTION ---
            "customer_psychology_archetype": psychology["customer_psychology_archetype"],
            "frequently_abandons_checkout": psychology["frequently_abandons_checkout"],
            "historical_checkout_abandonment_count": psychology["historical_checkout_abandonment_count"],
            "checkout_abandonment_risk_score": psychology["checkout_abandonment_risk_score"],
            "primary_abandonment_trigger": psychology["primary_abandonment_trigger"],
            "dropoff_stage_affinity": psychology["dropoff_stage_affinity"],
            "hesitation_dwell_time_seconds": psychology["hesitation_dwell_time_seconds"],
            "security_anxiety_index": psychology["security_anxiety_index"],
            "price_sensitivity_index": psychology["price_sensitivity_index"],
            "discount_responsiveness": psychology["discount_responsiveness"],
            "brand_trust_score": psychology["brand_trust_score"],
            "device_category": psychology["device_category"],
            "preferred_recovery_channel": psychology["preferred_recovery_channel"],
            "optimal_psychology_nudge": psychology["optimal_psychology_nudge"],
            "model_psychological_diagnosis": psychology["model_psychological_diagnosis"],

            # --- MODEL INFERENCES & ORCHESTRATION ---
            "ml_predicted_recovery_probability": ml_prob,
            "algorithmic_intent_score": intent_score,
            "recommended_recovery_action": recommended_action,
            "expected_recovery_value_inr": erv,
            "ground_truth_recovered_ai_policy": row["simulated_outcomes"]["AI_POLICY"],
            "ground_truth_recovered_static": row["simulated_outcomes"]["STATIC_BASELINE"]
        }
        enriched_rows.append(combined_row)

    # Write to CSV
    fieldnames = list(enriched_rows[0].keys())
    os.makedirs(os.path.dirname(OUTPUT_CSV_PATH), exist_ok=True)
    with open(OUTPUT_CSV_PATH, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(enriched_rows)

    file_size_mb = os.path.getsize(OUTPUT_CSV_PATH) / (1024 * 1024)
    print(f"\nSuccessfully generated and saved CSV dataset to:")
    print(f"-> {OUTPUT_CSV_PATH} ({file_size_mb:.2f} MB, {len(enriched_rows)} rows, {len(fieldnames)} columns)")

    # Print summary of behavioral analysis
    frequent_abandoners = sum(1 for r in enriched_rows if r["frequently_abandons_checkout"])
    print(f"\n--- Customer Psychology & Abandonment Analytics Summary ---")
    print(f"Total Cases: {len(enriched_rows)}")
    print(f"Frequent Checkout Abandoners: {frequent_abandoners} ({frequent_abandoners / len(enriched_rows) * 100:.1f}%)")
    
    # Archetype breakdown
    archetype_counts = {}
    for r in enriched_rows:
        arch = r["customer_psychology_archetype"]
        archetype_counts[arch] = archetype_counts.get(arch, 0) + 1
    
    print("\nPsychological Archetypes Identified by Model:")
    for arch, cnt in sorted(archetype_counts.items(), key=lambda x: x[1], reverse=True):
        avg_prob = sum(r["ml_predicted_recovery_probability"] for r in enriched_rows if r["customer_psychology_archetype"] == arch) / cnt
        print(f"  * {arch:30s}: {cnt:5d} cases ({cnt / len(enriched_rows) * 100:4.1f}%) | Avg P(Recovery): {avg_prob:.3f}")

if __name__ == "__main__":
    export_enriched_dataset(20000, 42)
