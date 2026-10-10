class FakeLLM:
    """Scripted stand-in for Gemini: returns queued responses in order and records every call."""

    def __init__(self, *responses: object) -> None:
        self.responses, self.calls = list(responses), []

    def generate_json(self, system, parts, schema, **kwargs):
        self.calls.append({"system": system, "parts": parts, "schema": schema, **kwargs})
        item = self.responses.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


class FakeGrounded:
    """Scripted stand-in for Gemini with Google Search: returns queued GroundedAnswer objects."""

    def __init__(self, *answers) -> None:
        self.answers, self.calls = list(answers), []

    def grounded_text(self, system, parts, **kwargs):
        self.calls.append({"system": system, "parts": parts, **kwargs})
        item = self.answers.pop(0)
        if isinstance(item, Exception):
            raise item
        return item
