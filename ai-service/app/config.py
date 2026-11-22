from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Kafka
    kafka_bootstrap: str = "localhost:9094"
    topic_in: str = "autocare.events"
    topic_out: str = "assistant.events"

    # Shared secret: only the Spring backend may call this service
    internal_token: str = "dev-internal-token"

    # LLM: "mock" works with no model at all; "openai" works with any
    # OpenAI-compatible API (OpenAI, Ollama /v1, Groq, OpenRouter...)
    llm_provider: str = "mock"
    llm_base_url: str = "http://host.docker.internal:11434/v1"
    llm_api_key: str = "ollama"
    llm_model: str = "llama3.2"

    # Suggest a service every N km
    service_interval_km: int = 10_000


settings = Settings()
