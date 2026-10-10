import json
import logging
import os
import urllib.error
import urllib.request
from pathlib import Path

from apps.api.domain.llm import GroundedAnswer
from apps.api.domain.plan import PlanUnavailable

log = logging.getLogger("quantaris.gemini")
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def load_local_env() -> None:
    """Read KEY=VALUE lines from the repo's gitignored .env.local without overriding the real environment."""
    path = Path(__file__).resolve().parents[3] / ".env.local"
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


class _Truncated(Exception):
    """The model hit its output limit before finishing."""


class GeminiClient:
    """Thin Gemini REST client (Developer API key). Credentials come from GEMINI_API_KEY in .env.local; swap to Vertex AI later without touching callers."""

    def __init__(self, timeout_seconds: float = 40.0) -> None:
        load_local_env()
        self.key = os.environ.get("GEMINI_API_KEY", "")
        self.model = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
        self.timeout = timeout_seconds

    def generate_json(self, system: str, parts: list[dict], schema: dict, *, temperature: float = 0.4, max_tokens: int = 6000, timeout: float | None = None, thinking_budget: int | None = 0) -> object:
        config: dict = {"responseMimeType": "application/json", "responseSchema": schema, "temperature": temperature, "maxOutputTokens": max_tokens}
        if thinking_budget is not None:  # model "thinking" is slow and spends output tokens; structured drafting does not need much of it
            config["thinkingConfig"] = {"thinkingBudget": thinking_budget}
        return self._run(system, parts, config, None, timeout, lambda candidate: json.loads(candidate["content"]["parts"][0]["text"]), structured=True)

    def grounded_text(self, system: str, parts: list[dict], *, temperature: float = 0.3, max_tokens: int = 4000, timeout: float | None = None) -> GroundedAnswer:
        """Answer using live Google Search. The model decides what to search; the queries, sources and supported passages come back with the text."""
        config: dict = {"temperature": temperature, "maxOutputTokens": max_tokens, "thinkingConfig": {"thinkingBudget": 0}}

        def parse(candidate: dict) -> GroundedAnswer:
            text = "".join(part.get("text", "") for part in candidate["content"]["parts"]).strip()
            if not text:
                raise ValueError("empty text")
            meta = candidate.get("groundingMetadata", {})
            sources = [((c.get("web") or {}).get("title", "") or "Web source", (c.get("web") or {}).get("uri", "")) for c in meta.get("groundingChunks", [])]
            supports = [((s.get("segment") or {}).get("text", ""), list(s.get("groundingChunkIndices", []))) for s in meta.get("groundingSupports", [])]
            return GroundedAnswer(text, sources, supports, list(meta.get("webSearchQueries", [])))

        return self._run(system, parts, config, [{"google_search": {}}], timeout, parse)

    def generate_image(self, prompt: str, *, timeout: float = 90) -> tuple[str, str]:
        """One illustration from the image model. Returns (mime type, base64 data)."""
        model = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")

        def parse(candidate: dict) -> tuple[str, str]:
            for part in candidate["content"]["parts"]:
                blob = part.get("inlineData") or part.get("inline_data")
                if blob and blob.get("data"):
                    return blob.get("mimeType") or blob.get("mime_type") or "image/png", blob["data"]
            raise ValueError("no image in answer")

        return self._run("You draw clean, accurate technical illustrations for factory planning reports.", [{"text": prompt}], {"responseModalities": ["IMAGE"]}, None, timeout, parse, model)

    # ---- Veo video: a long-running job that is started, polled, and then downloaded
    def _veo_request(self, url: str, body: dict | None, timeout: float) -> dict:
        data = json.dumps(body).encode() if body is not None else None
        headers = {"x-goog-api-key": self.key, **({"Content-Type": "application/json"} if body is not None else {})}
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers), timeout=timeout))
        except urllib.error.HTTPError as error:
            log.warning("veo call failed: HTTP %s", error.code)
            raise PlanUnavailable("PROVIDER_ERROR", "The video service couldn't take that request right now." if error.code != 429 else "The video service is busy or its quota is used up. Please try again later.", 429 if error.code == 429 else 502) from None
        except Exception as error:
            log.warning("veo call failed: %s", type(error).__name__)
            raise PlanUnavailable("PROVIDER_ERROR", "The video service couldn't be reached. Please try again.") from None

    def start_video(self, prompt: str, *, model: str, duration_s: int = 4, resolution: str = "720p") -> str:
        if not self.key:
            raise PlanUnavailable("NOT_CONFIGURED", "AI isn't set up yet: add GEMINI_API_KEY to .env.local and restart the API.", 503)
        body = {"instances": [{"prompt": prompt}], "parameters": {"aspectRatio": "16:9", "durationSeconds": duration_s, "resolution": resolution}}
        try:
            op = self._veo_request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:predictLongRunning", body, 30)
        except PlanUnavailable:
            op = self._veo_request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:predictLongRunning", {"instances": body["instances"]}, 30)  # some models reject the optional settings
        name = op.get("name", "")
        if not name:
            raise PlanUnavailable("PROVIDER_ERROR", "The video service didn't start the clip. Please try again.")
        return name

    def check_video(self, operation: str) -> tuple[str, str]:
        """Returns ("working", "") while it runs, ("done", download uri) when ready, or ("failed", a friendly reason)."""
        op = self._veo_request(f"https://generativelanguage.googleapis.com/v1beta/{operation}", None, 30)
        if not op.get("done"):
            return "working", ""
        if op.get("error"):
            return "failed", "The video service couldn't make this clip."
        response = op.get("response", {})
        samples = (response.get("generateVideoResponse") or response).get("generatedSamples") or []
        uri = ((samples[0] or {}).get("video") or {}).get("uri", "") if samples else ""
        if not uri:
            reasons = (response.get("generateVideoResponse") or {}).get("raiMediaFilteredReasons") or []
            return "failed", "The video service declined to make this clip." if reasons else "The video service returned no clip."
        return "done", uri

    def download_video(self, uri: str, max_bytes: int = 60_000_000) -> bytes:
        if not uri.startswith("https://generativelanguage.googleapis.com/"):
            raise PlanUnavailable("PROVIDER_ERROR", "The clip came from an unexpected place, so it was not used.")
        try:
            data = urllib.request.urlopen(urllib.request.Request(uri, headers={"x-goog-api-key": self.key}), timeout=120).read(max_bytes + 1)
        except Exception as error:
            log.warning("veo download failed: %s", type(error).__name__)
            raise PlanUnavailable("PROVIDER_ERROR", "The clip couldn't be downloaded. Please try again.") from None
        if len(data) > max_bytes or data[4:8] != b"ftyp":
            raise PlanUnavailable("PROVIDER_ERROR", "The clip wasn't a usable video.")
        return data

    def _run(self, system: str, parts: list[dict], config: dict, tools: list[dict] | None, timeout: float | None, parse, model: str | None = None, structured: bool = False):
        if not self.key:
            raise PlanUnavailable("NOT_CONFIGURED", "AI isn't set up yet: add GEMINI_API_KEY to .env.local and restart the API.", 503)
        for attempt in (1, 2):
            if attempt == 2:  # an identical retry tends to repeat a RECITATION block, so vary the sampling a little
                config = {**config, "temperature": min(1.0, config.get("temperature", 0.4) + 0.5)}
            body = {"systemInstruction": {"parts": [{"text": system}]}, "contents": [{"role": "user", "parts": parts}], "generationConfig": config}
            if tools:
                body["tools"] = tools
            request = urllib.request.Request(ENDPOINT.format(model=model or self.model), data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": self.key})
            try:
                response = json.load(urllib.request.urlopen(request, timeout=timeout or self.timeout))
                candidate = response["candidates"][0]
                if "parts" not in candidate.get("content", {}):
                    log.warning("gemini returned no content: finishReason=%s (attempt %s)", candidate.get("finishReason"), attempt)
                    raise ValueError("empty candidate")
                if structured and candidate.get("finishReason") == "MAX_TOKENS":  # structured output cut off mid-way cannot be valid JSON (free text that is cut short is still usable)
                    raise _Truncated()
                return parse(candidate)
            except urllib.error.HTTPError as error:
                log.warning("gemini call failed: HTTP %s (attempt %s)", error.code, attempt)
                if error.code == 429:
                    raise PlanUnavailable("PROVIDER_ERROR", "The AI service is busy right now. Please try again in a moment.", 429) from None
                if error.code == 400 and attempt == 1 and "thinkingConfig" in config:  # this model may not accept the thinking setting
                    config = {k: v for k, v in config.items() if k != "thinkingConfig"}
                    continue
                if error.code < 500 or attempt == 2:  # other client errors won't improve on retry
                    raise PlanUnavailable("PROVIDER_ERROR", "The AI service returned an error. Please try again.") from None
            except Exception as error:  # timeout, network, empty or truncated or malformed output: retry once, never leak details or the key
                log.warning("gemini call failed: %s (attempt %s)", type(error).__name__, attempt)
                if isinstance(error, _Truncated) and "maxOutputTokens" in config:  # retry with room to finish
                    config = {**config, "maxOutputTokens": min(int(config["maxOutputTokens"] * 1.7), 16000)}
                if attempt == 2:
                    raise PlanUnavailable("PROVIDER_ERROR", "We couldn't get a usable answer from the AI service. Please try again.") from None
