import re
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from pydantic import ValidationError

from apps.api.domain.contracts import Claim, ClaimClassification, EvidenceItem
from apps.api.domain.research import RawFinding, ResearchProvider, ResearchRequest

MAX_STATEMENT_CHARS = 600
MAX_FINDINGS_PER_QUERY = 5
STALE_AFTER = timedelta(days=730)
# Retrieved text is data. Anything that reads like an instruction to the system is dropped.
INJECTION_PATTERN = re.compile(
    r"ignore (all |any )?(previous|prior|above)|system prompt|you are now|disregard .{0,30}instructions|<script|javascript:",
    re.IGNORECASE,
)


class ResearchOutcome:
    def __init__(self) -> None:
        self.claims: list[Claim] = []
        self.evidence: list[EvidenceItem] = []
        self.unknowns: list[Claim] = []
        self.rejected: list[str] = []


class ResearchService:
    def __init__(self, provider: ResearchProvider, max_queries: int = 10, timeout_seconds: float = 10.0) -> None:
        self._provider = provider
        self._max_queries = max_queries
        self._timeout = timeout_seconds
        self._queries_used = 0

    def research(self, request: ResearchRequest) -> ResearchOutcome:
        outcome = ResearchOutcome()
        if self._queries_used >= self._max_queries:
            outcome.unknowns.append(self._unknown(request, "Research query budget exhausted"))
            return outcome
        self._queries_used += 1

        pool = ThreadPoolExecutor(max_workers=1)
        try:
            findings = pool.submit(self._provider.search, request).result(timeout=self._timeout)
        except FutureTimeout:
            outcome.unknowns.append(self._unknown(request, "Research provider timed out"))
            return outcome
        except Exception:  # provider failures must never crash a scenario or leak details
            outcome.unknowns.append(self._unknown(request, "Research provider failed"))
            return outcome
        finally:
            pool.shutdown(wait=False)

        if not isinstance(findings, list):
            outcome.unknowns.append(self._unknown(request, "Research provider returned malformed output"))
            return outcome

        for raw in findings[:MAX_FINDINGS_PER_QUERY]:
            reason = self._accept(raw, outcome, request)
            if reason:
                outcome.rejected.append(reason)

        if not outcome.claims:
            outcome.unknowns.append(self._unknown(request, "No verified evidence available"))
        return outcome

    def _accept(self, raw: object, outcome: ResearchOutcome, request: ResearchRequest) -> str | None:
        try:
            finding = raw if isinstance(raw, RawFinding) else RawFinding.model_validate(raw)
        except ValidationError:
            return "malformed finding"
        if not finding.statement.strip() or len(finding.statement) > MAX_STATEMENT_CHARS:
            return "statement empty or too long"
        if INJECTION_PATTERN.search(finding.statement) or INJECTION_PATTERN.search(finding.source_title):
            return "instruction-like content"
        if not finding.source_url.startswith("https://"):
            return "source url must be https"
        if not 0 <= finding.confidence <= 1:
            return "confidence out of range"

        claim_id = f"clm_{uuid4().hex[:10]}"
        now = datetime.now(timezone.utc)
        published = finding.published_at
        if published is not None and published.tzinfo is None:
            published = published.replace(tzinfo=timezone.utc)
        stale = published is not None and now - published > STALE_AFTER
        freshness = "STALE" if stale else ("PERIODIC_DATASET" if published else "CURRENT_RESEARCH")
        geography_mismatch = bool(finding.geography) and finding.geography.lower() not in request.geography.lower() and request.geography.lower() not in finding.geography.lower()
        confidence = finding.confidence * (0.5 if stale or geography_mismatch else 1.0)
        try:
            evidence = EvidenceItem(
                evidence_id=f"evd_{uuid4().hex[:10]}",
                claim_id=claim_id,
                source_title=finding.source_title,
                source_provider=finding.source_provider,
                source_url=finding.source_url,
                retrieved_at=finding.retrieved_at,
                published_at=published,
                extracted_fact=finding.statement,
                geography=finding.geography,
                units=finding.units,
                confidence=confidence,
                source_type=finding.source_type,
                freshness=freshness,
                methodology="Provider finding normalized by ResearchService",
                usage_license_metadata="Provider terms apply; attribution retained",
            )
        except ValidationError:
            return "invalid evidence"
        classification = ClaimClassification.INFERENCE if (stale or geography_mismatch) else ClaimClassification.FACT
        outcome.claims.append(
            Claim(
                claim_id=claim_id,
                statement=finding.statement,
                classification=classification,
                confidence=confidence,
                evidence_ids=[evidence.evidence_id],
                reason="Stale or geographically mismatched evidence; requires validation" if classification is ClaimClassification.INFERENCE else None,
            )
        )
        outcome.evidence.append(evidence)
        return None

    @staticmethod
    def _unknown(request: ResearchRequest, reason: str) -> Claim:
        return Claim(
            claim_id=f"clm_{uuid4().hex[:10]}",
            statement=f"{request.topic.value.replace('_', ' ').title()} for {request.geography} is unavailable.",
            classification=ClaimClassification.UNKNOWN,
            reason=reason,
        )
