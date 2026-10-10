class FakePlanProvider:
    """Deterministic stand-in for tests and offline development."""

    def __init__(self, response: object = None, error: Exception | None = None) -> None:
        self.response, self.error, self.prompts = response, error, []

    def draft(self, prompt: str, language: str = "en") -> object:
        self.prompts.append(prompt)
        if self.error:
            raise self.error
        return self.response
