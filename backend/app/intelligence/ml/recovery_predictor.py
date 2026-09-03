import os
import json
import joblib
import numpy as np
from typing import Dict, Any, Optional

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

class MLRecoveryPredictor:
    """
    Inference engine that loads the trained RandomForest recovery model
    to predict P(recovery | context, action) and data-driven ERV in real time.
    """
    def __init__(self):
        self.model = None
        self.scaler = None
        self.encoder = None
        self.metrics = {}
        self._load_artifacts()

    def _load_artifacts(self):
        try:
            model_path = os.path.join(MODEL_DIR, "recovery_rf_model.joblib")
            scaler_path = os.path.join(MODEL_DIR, "scaler.joblib")
            encoder_path = os.path.join(MODEL_DIR, "encoder.joblib")
            metrics_path = os.path.join(MODEL_DIR, "model_metrics.json")

            if os.path.exists(model_path) and os.path.exists(scaler_path) and os.path.exists(encoder_path):
                self.model = joblib.load(model_path)
                self.scaler = joblib.load(scaler_path)
                self.encoder = joblib.load(encoder_path)
                
                if os.path.exists(metrics_path):
                    with open(metrics_path, "r") as f:
                        self.metrics = json.load(f)
        except Exception as e:
            print(f"[MLRecoveryPredictor] Warning: Failed to load trained ML model: {e}")

    def predict_recovery_probability(
        self,
        amount_inr: float,
        checkout_progress: float = 0.8,
        previous_purchase_count: int = 2,
        previous_payment_success_rate: float = 0.85,
        customer_ltv: float = 5000.0,
        time_since_failure_minutes: float = 5.0,
        contact_count_24h: int = 0,
        customer_session_active: bool = True,
        rail_degraded: bool = False,
        opted_out: bool = False,
        payment_method: str = "card",
        issuer_or_rail: str = "hdfc",
        failure_code: str = "issuer_technical_error",
        domain: str = "PAYMENT_FAILURE"
    ) -> float:
        """
        Predicts the real ML-calibrated probability of recovery P(recovery).
        """
        if self.model is None or self.scaler is None or self.encoder is None:
            # Fallback heuristic if artifacts not loaded
            base_p = 0.65 if not rail_degraded and not opted_out else 0.1
            return base_p

        num_features = np.array([[
            amount_inr,
            checkout_progress,
            previous_purchase_count,
            previous_payment_success_rate,
            customer_ltv,
            time_since_failure_minutes,
            contact_count_24h,
            1.0 if customer_session_active else 0.0,
            1.0 if rail_degraded else 0.0,
            1.0 if opted_out else 0.0
        ]])

        cat_features = [[
            payment_method,
            issuer_or_rail,
            failure_code,
            domain
        ]]

        try:
            X_num_scaled = self.scaler.transform(num_features)
            X_cat_encoded = self.encoder.transform(cat_features)
            X = np.hstack([X_num_scaled, X_cat_encoded])

            # Output probability of recovery class 1
            prob = float(self.model.predict_proba(X)[0][1])
            return round(prob, 4)
        except Exception as e:
            return 0.55

    def get_model_info(self) -> Dict[str, Any]:
        return self.metrics

# Global ML predictor singleton
ml_predictor = MLRecoveryPredictor()
