import os
import json
import joblib
import numpy as np
from typing import Dict, Any, Tuple
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, precision_score, recall_score, f1_score, brier_score_loss
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from data.generators.synthetic_dataset import generate_synthetic_recovery_dataset

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)

def train_and_save_ml_model(sample_size: int = 20000, seed: int = 42) -> Dict[str, Any]:
    """
    Trains a supervised Machine Learning model (Random Forest / Gradient Boosting)
    on the 20,000 synthetic transaction dataset to estimate P(recovery | context, action).
    """
    print(f"Generating {sample_size} synthetic training records...")
    raw_data = generate_synthetic_recovery_dataset(count=sample_size, seed=seed)

    # 1. Feature Engineering
    features = []
    labels = []
    
    for row in raw_data:
        # Features vector
        feat = {
            "amount_inr": row["amount_inr"],
            "checkout_progress": row["checkout_progress"],
            "previous_purchase_count": row["previous_purchase_count"],
            "previous_payment_success_rate": row["previous_payment_success_rate"],
            "customer_ltv": row["customer_ltv"],
            "time_since_failure_minutes": row["time_since_failure_minutes"],
            "contact_count_24h": row["contact_count_24h"],
            "customer_session_active": 1.0 if row["customer_session_active"] else 0.0,
            "rail_degraded": 1.0 if row["rail_degraded"] else 0.0,
            "opted_out": 1.0 if row["opted_out"] else 0.0,
            "payment_method": row["payment_method"],
            "issuer_or_rail": row["issuer_or_rail"],
            "failure_code": row["failure_code"],
            "domain": row["domain"]
        }
        features.append(feat)
        
        # Label: AI Policy outcome (1 if recovered, 0 otherwise)
        label = 1 if row["simulated_outcomes"]["AI_POLICY"] else 0
        labels.append(label)

    # Extract numerical & categorical features
    num_cols = [
        "amount_inr", "checkout_progress", "previous_purchase_count",
        "previous_payment_success_rate", "customer_ltv", "time_since_failure_minutes",
        "contact_count_24h", "customer_session_active", "rail_degraded", "opted_out"
    ]
    cat_cols = ["payment_method", "issuer_or_rail", "failure_code", "domain"]

    X_num = np.array([[f[col] for col in num_cols] for f in features])
    X_cat_raw = [[f[col] for col in cat_cols] for f in features]

    # Preprocessing
    scaler = StandardScaler()
    X_num_scaled = scaler.fit_transform(X_num)

    encoder = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
    X_cat_encoded = encoder.fit_transform(X_cat_raw)

    X = np.hstack([X_num_scaled, X_cat_encoded])
    y = np.array(labels)

    # Train / Test Split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=seed, stratify=y
    )

    print(f"Training RandomForestClassifier on {len(X_train)} samples...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_split=10,
        random_state=seed,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # Evaluate Metrics
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    roc_auc = float(roc_auc_score(y_test, y_prob))
    precision = float(precision_score(y_test, y_pred, zero_division=0))
    recall = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    brier = float(brier_score_loss(y_test, y_prob))

    # Feature Importance Mapping
    encoded_cat_names = encoder.get_feature_names_out(cat_cols)
    all_feature_names = num_cols + list(encoded_cat_names)
    importances = model.feature_importances_
    
    top_indices = np.argsort(importances)[::-1][:10]
    top_features = [
        {"feature": all_feature_names[i], "importance": float(round(importances[i], 4))}
        for i in top_indices
    ]

    metrics = {
        "model_type": "RandomForestClassifier",
        "sample_size": sample_size,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "roc_auc": round(roc_auc, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "brier_score": round(brier, 4),
        "top_features": top_features
    }

    # Save artifacts
    joblib.dump(model, os.path.join(MODEL_DIR, "recovery_rf_model.joblib"))
    joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.joblib"))
    joblib.dump(encoder, os.path.join(MODEL_DIR, "encoder.joblib"))
    
    with open(os.path.join(MODEL_DIR, "model_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"Model training complete! ROC-AUC: {metrics['roc_auc']}, F1-Score: {metrics['f1_score']}")
    return metrics

if __name__ == "__main__":
    train_and_save_ml_model()
