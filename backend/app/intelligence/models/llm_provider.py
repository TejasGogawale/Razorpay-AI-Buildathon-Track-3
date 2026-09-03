import os
from typing import Optional, Any
from ...core.config import settings

class LLMProviderFactory:
    """
    Factory for instantiating LangChain Chat Models based on available API keys in .env.
    Supports Google Gemini (Free tier), Groq (Free tier), and OpenAI.
    """

    @staticmethod
    def get_chat_model(temperature: float = 0.1, model_type: str = "primary", **kwargs) -> Optional[Any]:
        # 1. Try Google Gemini (Free Tier)
        gemini_key = settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if gemini_key:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                return ChatGoogleGenerativeAI(
                    model="gemini-2.0-flash",
                    google_api_key=gemini_key,
                    temperature=temperature
                )
            except Exception as e:
                print(f"[LLMProviderFactory] Warning: Failed to init ChatGoogleGenerativeAI: {e}")

        # 2. Try Groq (Free Tier)
        groq_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY")
        if groq_key:
            try:
                from langchain_groq import ChatGroq
                return ChatGroq(
                    model_name="llama-3.3-70b-versatile",
                    groq_api_key=groq_key,
                    temperature=temperature
                )
            except Exception as e:
                print(f"[LLMProviderFactory] Warning: Failed to init ChatGroq: {e}")

        # 3. Try OpenAI
        openai_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
        if openai_key:
            try:
                from langchain_openai import ChatOpenAI
                return ChatOpenAI(
                    model="gpt-4o-mini",
                    api_key=openai_key,
                    temperature=temperature
                )
            except Exception as e:
                print(f"[LLMProviderFactory] Warning: Failed to init ChatOpenAI: {e}")

        return None
