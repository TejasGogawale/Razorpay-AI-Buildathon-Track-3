import json
import time
import httpx
from typing import Dict, Any, Optional, Type, TypeVar, Tuple
from pydantic import BaseModel, Field
from ...core.config import settings

T = TypeVar("T", bound=BaseModel)

class ModelRunResult(BaseModel):
    model_name: str
    provider: str
    latency_ms: int
    success: bool
    json_valid: bool = True
    output_data: Dict[str, Any] = Field(default_factory=dict)
    raw_output: str = ""
    error: Optional[str] = None

class ModelGateway:
    """
    Provider-agnostic Model Gateway based on PRD Section 22.
    Supports Ollama local models with seamless fallback to deterministic template reasoning.
    """
    
    def __init__(self):
        self.ollama_base_url = settings.OLLAMA_BASE_URL
        self.primary_model = settings.PRIMARY_LOCAL_MODEL
        self.fallback_model = settings.FALLBACK_LOCAL_MODEL

    async def check_ollama_health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=1.0) as client:
                res = await client.get(f"{self.ollama_base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    async def generate_structured(
        self,
        prompt: str,
        system_prompt: str,
        schema: Type[T],
        fallback_template_fn = None
    ) -> Tuple[T, ModelRunResult]:
        start_time = time.time()
        
        # Check if Ollama is available
        ollama_healthy = await self.check_ollama_health()
        
        if ollama_healthy:
            try:
                # Attempt with Ollama Primary Model
                payload = {
                    "model": self.primary_model,
                    "prompt": prompt,
                    "system": f"{system_prompt}\nOutput MUST be strictly valid JSON matching this schema:\n{json.dumps(schema.model_json_schema())}",
                    "stream": False,
                    "format": "json"
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(f"{self.ollama_base_url}/api/generate", json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_response = data.get("response", "{}")
                        parsed = json.loads(raw_response)
                        validated = schema.model_validate(parsed)
                        latency = int((time.time() - start_time) * 1000)
                        return validated, ModelRunResult(
                            model_name=self.primary_model,
                            provider="ollama",
                            latency_ms=latency,
                            success=True,
                            json_valid=True,
                            output_data=validated.model_dump(),
                            raw_output=raw_response
                        )
            except Exception as e:
                pass # Fallback to deterministic template

        # Deterministic Template Fallback (Guarantees zero-failure and offline resilience)
        if fallback_template_fn:
            template_result = fallback_template_fn()
            latency = int((time.time() - start_time) * 1000)
            return template_result, ModelRunResult(
                model_name="deterministic-engine-v1",
                provider="local-deterministic",
                latency_ms=max(1, latency),
                success=True,
                json_valid=True,
                output_data=template_result.model_dump(),
                raw_output="Generated via deterministic domain template"
            )
        else:
            raise ValueError("LLM unavailable and no fallback template provided")

model_gateway = ModelGateway()
