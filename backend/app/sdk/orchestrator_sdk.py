"""
RecoverOS Python SDK — Direct Drop-in Middleware for Payment Gateways & Merchants
Allows payment systems to evaluate next-best recovery actions in real time with 2 lines of code.

Example Usage:
```python
from backend.app.sdk.orchestrator_sdk import RecoverOSClient

client = RecoverOSClient(api_base="http://localhost:8000")
decision = await client.evaluate_failure(
    payment_id="pay_12345",
    amount_inr=4999.0,
    method="card",
    issuer="hdfc",
    error_code="BAD_REQUEST_ERROR",
    error_reason="Bank servers timed out"
)
print("Recommended Action:", decision["recommended_action"])
```
"""

import httpx
from typing import Dict, Any, Optional

class RecoverOSClient:
    def __init__(self, api_base: str = "http://localhost:8000/api/v1", api_key: Optional[str] = None):
        self.api_base = api_base.rstrip("/")
        self.api_key = api_key
        self.headers = {"Content-Type": "application/json"}
        if api_key:
            self.headers["Authorization"] = f"Bearer {api_key}"

    async def evaluate_failure(
        self,
        payment_id: str,
        amount_inr: float,
        method: str,
        issuer: str,
        error_code: str,
        error_reason: str,
        customer_contact: str = "+919876543210",
        order_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Direct evaluation endpoint for payment gateways to obtain the next-best action.
        """
        payload = {
            "entity": "event",
            "event": "payment.failed",
            "payload": {
                "payment": {
                    "entity": {
                        "id": payment_id,
                        "order_id": order_id or f"order_{payment_id}",
                        "amount": int(amount_inr * 100),
                        "currency": "INR",
                        "status": "failed",
                        "method": method,
                        "issuer": issuer,
                        "contact": customer_contact,
                        "error_code": error_code,
                        "error_reason": error_reason,
                        "error_description": error_reason
                    }
                }
            }
        }
        
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(f"{self.api_base}/webhooks/razorpay", json=payload, headers=self.headers)
            res_json = resp.json()
            case_id = res_json.get("case_id")
            if not case_id:
                return res_json
                
            dec_resp = await client.post(f"{self.api_base}/cases/{case_id}/decide", headers=self.headers)
            return dec_resp.json()
