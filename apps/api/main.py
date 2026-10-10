import json
from collections.abc import Iterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse

from apps.api.agents.answer_agent import AnswerAgent
from apps.api.agents.costs_agent import CostsAgent
from apps.api.agents.edit_agent import EditAgent
from apps.api.agents.existing_factory import ExistingFactoryAgent
from apps.api.agents.illustration_agent import IllustrationAgent
from apps.api.agents.insights_agent import InsightsAgent
from apps.api.agents.new_factory import NewFactoryAgent
from apps.api.agents.orchestrator import Orchestrator
from apps.api.agents.practices_agent import PracticesAgent
from apps.api.agents.research_agent import ResearchAgent
from apps.api.agents.step_env_agent import StepEnvAgent
from apps.api.agents.translate_agent import TranslateAgent
from apps.api.application.blueprint_service import BlueprintService
from apps.api.application.chat_service import CallBudget, ChatService
from apps.api.application.site_service import SiteService
from apps.api.application.video_service import VideoService
from apps.api.application.layout_engine import generate_layout, list_templates
from apps.api.application.scenario_service import ScenarioService
from apps.api.domain.contracts import ClarificationResponse, ScenarioRequest, ScenarioState
from apps.api.domain.chat import ChatRequest, ChatResponse
from apps.api.domain.costs import BuildCosts, CostsRequest
from apps.api.domain.edit import EditRequest, EditResponse
from apps.api.domain.illustration import StepImage, StepImageRequest
from apps.api.domain.insights import FactoryInsights, InsightsRequest
from apps.api.domain.layout import BlueprintRequest, LayoutRequest, LayoutResult, TemplateSummary
from apps.api.domain.plan import PlanUnavailable
from apps.api.domain.ops import OpsPack, OpsRequest
from apps.api.agents.ops_agents import BriefAgent, InspectAgent
from apps.api.domain.ops_ai import Brief, BriefRequest, InspectRequest, InspectResult
from apps.api.domain.balance import BalanceRequest, BalanceResult
from apps.api.ops.balance import balance
from apps.api.ops.engine import build_pack
from apps.api.domain.step_env import StepEnvRequest, StepEnvironment
from apps.api.domain.video import StepVideoRequest, VideoJob
from apps.api.domain.translate import TranslateRequest, TranslateResponse
from apps.api.domain.practices import BestPractices, PracticesRequest
from apps.api.domain.siting import ResearchRequest, SiteConditions, SiteResearch
from apps.api.integrations.gemini_client import GeminiClient
from apps.api.integrations.gemini_plan import GeminiPlanProvider
from apps.api.integrations.geocoding import default_geocoder, default_places_finder
from apps.api.integrations.live_conditions import OpenMeteoConditions

app = FastAPI(title="QuantarisAI API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?", allow_methods=["GET", "POST"], allow_headers=["Content-Type"])
service = ScenarioService()
gemini = GeminiClient()
plan_provider = GeminiPlanProvider(client=gemini)
blueprints = BlueprintService(plan_provider)
# The chat path is budgeted by CallBudget below, so its blueprint service does not double-count.
geocoder = default_geocoder()  # Google Geocoding once GOOGLE_MAPS_SERVER_KEY is set, OpenStreetMap until then
site_service = SiteService(geocoder, OpenMeteoConditions())
chat = ChatService(Orchestrator(gemini), NewFactoryAgent(BlueprintService(plan_provider, calls_per_hour=10**6)), ExistingFactoryAgent(gemini), CallBudget(60), site_service, AnswerAgent(gemini, gemini))
research_agent = ResearchAgent(gemini, gemini, geocoder, default_places_finder())
research_budget = CallBudget(40)
insights_agent = InsightsAgent(gemini)
insights_budget = CallBudget(40)
translate_agent = TranslateAgent(gemini)
translate_budget = CallBudget(80)
illustration_agent = IllustrationAgent(gemini)
illustration_budget = CallBudget(60)
practices_agent = PracticesAgent(gemini)
edit_agent = EditAgent(gemini)
costs_agent = CostsAgent(gemini)
step_env_agent = StepEnvAgent(gemini)
video_service = VideoService(gemini)
step_env_budget = CallBudget(120)
brief_agent = BriefAgent(gemini)
inspect_agent = InspectAgent(gemini)
ops_ai_budget = CallBudget(150)
costs_budget = CallBudget(40)
edit_budget = CallBudget(80)
practices_budget = CallBudget(40)


def scenario_or_404(scenario_id: str) -> ScenarioState:
    try:
        return service.get(scenario_id)
    except KeyError as error:
        raise HTTPException(status_code=404, detail={"code": "SCENARIO_NOT_FOUND", "message": "Scenario was not found."}) from error


@app.post("/api/scenarios", response_model=ScenarioState, status_code=201)
def create_scenario(request: ScenarioRequest) -> ScenarioState:
    return service.create(request)


@app.post("/api/scenarios/{scenario_id}/clarifications", response_model=ScenarioState)
def answer_clarifications(scenario_id: str, response: ClarificationResponse) -> ScenarioState:
    scenario_or_404(scenario_id)
    return service.answer(scenario_id, response)


@app.get("/api/scenarios/{scenario_id}", response_model=ScenarioState)
def get_scenario(scenario_id: str) -> ScenarioState:
    return scenario_or_404(scenario_id)


@app.get("/api/scenarios/{scenario_id}/events")
def stream_events(scenario_id: str) -> StreamingResponse:
    scenario_or_404(scenario_id)

    def event_stream() -> Iterator[str]:
        for event in service.events(scenario_id):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@app.get("/api/layouts/templates", response_model=list[TemplateSummary])
def layout_templates() -> list[TemplateSummary]:
    return list_templates()


@app.post("/api/layouts", response_model=LayoutResult)
def create_layout(request: LayoutRequest) -> LayoutResult:
    return generate_layout(request)


@app.post("/api/blueprints", response_model=LayoutResult)
def create_blueprint(request: BlueprintRequest) -> LayoutResult:
    try:
        return blueprints.create(request)
    except PlanUnavailable as error:
        raise HTTPException(status_code=error.status, detail={"code": error.code, "message": error.message}) from error


@app.post("/api/chat", response_model=ChatResponse)
def chat_message(request: ChatRequest) -> ChatResponse:
    try:
        return chat.handle(request)
    except PlanUnavailable as error:
        raise HTTPException(status_code=error.status, detail={"code": error.code, "message": error.message}) from error


@app.post("/api/research", response_model=SiteResearch)
def research(request: ResearchRequest) -> SiteResearch:
    try:
        research_budget.acquire(2)  # one grounded search plus one structuring call
        return research_agent.research(request)
    except PlanUnavailable as error:
        raise HTTPException(status_code=error.status, detail={"code": error.code, "message": error.message}) from error


@app.post("/api/insights", response_model=FactoryInsights)
def insights(request: InsightsRequest) -> FactoryInsights:
    try:
        insights_budget.acquire(1)
        return insights_agent.generate(request)
    except PlanUnavailable as error:
        raise HTTPException(status_code=error.status, detail={"code": error.code, "message": error.message}) from error


@app.post("/api/translate", response_model=TranslateResponse)
def translate(request: TranslateRequest) -> TranslateResponse:
    try:
        translate_budget.acquire(1)
        return translate_agent.translate(request)
    except PlanUnavailable as error:
        raise HTTPException(status_code=error.status, detail={"code": error.code, "message": error.message}) from error


@app.post("/api/step-image", response_model=StepImage)
def step_image(request: StepImageRequest) -> StepImage:
    try:
        illustration_budget.acquire(1)
        return illustration_agent.draw(request)
    except PlanUnavailable as error:
        raise HTTPException(status_code=error.status, detail={"code": error.code, "message": error.message}) from error


@app.post("/api/practices", response_model=BestPractices)
def practices(request: PracticesRequest) -> BestPractices:
    try:
        practices_budget.acquire(1)  # a single grounded search call
        return practices_agent.research(request)
    except PlanUnavailable as error:
        raise HTTPException(status_code=error.status, detail={"code": error.code, "message": error.message}) from error


@app.post("/api/edit-design", response_model=EditResponse)
def edit_design(request: EditRequest) -> EditResponse:
    try:
        edit_budget.acquire(1)
        return edit_agent.edit(request)
    except PlanUnavailable as error:
        raise HTTPException(status_code=error.status, detail={"code": error.code, "message": error.message}) from error


@app.post("/api/costs", response_model=BuildCosts)
def costs(request: CostsRequest) -> BuildCosts:
    try:
        costs_budget.acquire(2)  # a machines search and a land search
        return costs_agent.research(request)
    except PlanUnavailable as error:
        raise HTTPException(status_code=error.status, detail={"code": error.code, "message": error.message}) from error


@app.post("/api/step-environment", response_model=StepEnvironment)
def step_environment(request: StepEnvRequest) -> StepEnvironment:
    try:
        step_env_budget.acquire(1)
        return step_env_agent.explain(request)
    except PlanUnavailable as error:
        raise HTTPException(status_code=error.status, detail={"code": error.code, "message": error.message}) from error


@app.post("/api/ops", response_model=OpsPack)
def operations(request: OpsRequest) -> OpsPack:
    """Simulated plant data run through real analytics; deterministic, so no model call and no budget."""
    return build_pack(request)


@app.post("/api/balance", response_model=BalanceResult)
def resource_balance(request: BalanceRequest) -> BalanceResult:
    """Water, energy and waste balance from the plant's own daily records; arithmetic only."""
    return balance(request)


@app.post("/api/ops-brief", response_model=Brief)
def ops_brief(request: BriefRequest) -> Brief:
    try:
        ops_ai_budget.acquire(1)
        return brief_agent.brief(request)
    except PlanUnavailable as error:
        raise HTTPException(status_code=error.status, detail={"code": error.code, "message": error.message}) from error


@app.post("/api/inspect", response_model=InspectResult)
def inspect_photo(request: InspectRequest) -> InspectResult:
    try:
        ops_ai_budget.acquire(1)
        return inspect_agent.inspect(request)
    except PlanUnavailable as error:
        raise HTTPException(status_code=error.status, detail={"code": error.code, "message": error.message}) from error


@app.post("/api/step-video", response_model=VideoJob)
def start_step_video(request: StepVideoRequest) -> VideoJob:
    try:
        return video_service.start(request)
    except PlanUnavailable as error:
        raise HTTPException(status_code=error.status, detail={"code": error.code, "message": error.message}) from error


@app.get("/api/step-video/{job_id}", response_model=VideoJob)
def step_video_status(job_id: str) -> VideoJob:
    try:
        return video_service.status(job_id)
    except PlanUnavailable as error:
        raise HTTPException(status_code=error.status, detail={"code": error.code, "message": error.message}) from error


@app.get("/api/step-video/{job_id}/file")
def step_video_file(job_id: str) -> FileResponse:
    try:
        path = video_service.path(job_id)
    except PlanUnavailable as error:
        raise HTTPException(status_code=error.status, detail={"code": error.code, "message": error.message}) from error
    if not path.exists():
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "That video was not found."})
    return FileResponse(path, media_type="video/mp4", headers={"Cache-Control": "private, max-age=86400"})


@app.get("/api/site", response_model=SiteConditions)
def site_conditions(place: str) -> SiteConditions:
    """Measured conditions (weather, wind, sunshine, air) at a place, so a plan moved to a new place can follow it."""
    found = site_service.lookup(place.strip()[:120]) if place.strip() else None
    if not found:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "That place was not found."})
    return found
