import hashlib
import os
import re
import time
from pathlib import Path

from apps.api.application.chat_service import CallBudget
from apps.api.application.research_service import INJECTION_PATTERN
from apps.api.domain.plan import PlanUnavailable
from apps.api.domain.video import StepVideoRequest, VideoClient, VideoJob

JOB_ID = re.compile(r"^[0-9a-f]{20}$")
MAX_WAIT_SECONDS = 600


def build_prompt(r: StepVideoRequest) -> str:
    machines = f" Show these machines working: {', '.join(r.equipment)}." if r.equipment else ""
    if r.focus == "water":
        note = f" The plant handles it like this: {r.water_note}" if r.water_note.strip() else ""
        return (f"A short, realistic documentary-style video of how a {r.industry} in India handles the used water and waste from its '{r.label}' step.{machines} Show the machine using water, the dirty water leaving through a covered drain into a pipe, "
                f"flowing to an effluent treatment plant with settling tanks and aeration, and clean treated water being reused; workers in hard hats checking the plant.{note} A clean, safe, environmentally responsible plant. "
                "Smooth slow camera, natural light, only machine and water ambience, no speech, no music, no text, no logos.")
    makes = f" What comes out of this step: {', '.join(r.outputs)}." if r.outputs else ""
    what = f" What happens here: {r.detail}" if r.detail.strip() else ""
    return (f"A short, realistic documentary-style video inside the '{r.label}' area of a {r.industry} in India.{machines}{makes}{what} A few workers in hard hats and safety vests do their jobs while material moves through the step. "
            "Smooth slow camera, natural light, only machine ambience, no speech, no music, no text, no logos.")


class VideoService:
    """Short clips of a step, made with Google Veo only when asked (it is a paid service).

    The same step and story always map to the same clip, so a clip that exists is never paid for twice. Clips are kept on disk and served by this API.
    """

    def __init__(self, client: VideoClient, cache_dir: Path | None = None, budget: CallBudget | None = None, model: str | None = None) -> None:
        self._client = client
        self._dir = cache_dir or Path(os.environ.get("VIDEO_CACHE_DIR", ".quantaris-cache/videos"))
        self._budget = budget or CallBudget(6)
        self._model = model or os.environ.get("VEO_MODEL", "veo-3.1-lite-generate-preview")
        self._ops: dict[str, tuple[str, float]] = {}

    @staticmethod
    def job_id_for(prompt: str) -> str:
        return hashlib.sha256(prompt.encode()).hexdigest()[:20]

    def path(self, job_id: str) -> Path:
        if not JOB_ID.match(job_id):
            raise PlanUnavailable("NOT_FOUND", "That video was not found.", 404)
        return self._dir / f"{job_id}.mp4"

    def start(self, request: StepVideoRequest) -> VideoJob:
        text = [request.industry, request.label, request.detail, request.water_note, *request.equipment, *request.outputs]
        if any(INJECTION_PATTERN.search(t) for t in text):
            raise PlanUnavailable("INVALID_PLAN", "That description contains content we don't accept.", 422)
        prompt = build_prompt(request); job_id = self.job_id_for(prompt)
        if self.path(job_id).exists():
            return VideoJob(job_id=job_id, status="done", url=f"/api/step-video/{job_id}/file", model=self._model)
        if job_id in self._ops:
            return VideoJob(job_id=job_id, status="working", model=self._model)
        self._budget.acquire(1)  # only a genuinely new clip counts against the hourly limit
        self._ops[job_id] = (self._client.start_video(prompt, model=self._model), time.monotonic())
        return VideoJob(job_id=job_id, status="working", model=self._model)

    def status(self, job_id: str) -> VideoJob:
        file = self.path(job_id)
        if file.exists():
            return VideoJob(job_id=job_id, status="done", url=f"/api/step-video/{job_id}/file", model=self._model)
        if job_id not in self._ops:
            return VideoJob(job_id=job_id, status="failed", message="This clip is no longer being made. Please start it again.", model=self._model)
        operation, started = self._ops[job_id]
        state, value = self._client.check_video(operation)
        if state == "working":
            if time.monotonic() - started > MAX_WAIT_SECONDS:
                del self._ops[job_id]
                return VideoJob(job_id=job_id, status="failed", message="The clip is taking too long. Please try again.", model=self._model)
            return VideoJob(job_id=job_id, status="working", model=self._model)
        del self._ops[job_id]
        if state == "failed":
            return VideoJob(job_id=job_id, status="failed", message=value, model=self._model)
        data = self._client.download_video(value)
        self._dir.mkdir(parents=True, exist_ok=True); file.write_bytes(data)
        return VideoJob(job_id=job_id, status="done", url=f"/api/step-video/{job_id}/file", model=self._model)
