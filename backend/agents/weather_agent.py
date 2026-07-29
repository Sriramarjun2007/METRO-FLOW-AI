"""Weather Agent -- observes scenario weather and advises speed caps."""

from __future__ import annotations

from .base_agent import AgentResult, BaseAgent, MessageBus


class WeatherAgent(BaseAgent):
    name = "Weather Agent"
    purpose = "Translate macro weather into speed caps, visibility warnings, and demand for public transport."
    algorithm = "Rule-based speed model (scenario-aware)"
    sdg_tags = [3, 7, 11, 13]

    def _run(self, snapshot: dict, bus: MessageBus) -> AgentResult:
        weather = snapshot.get("weather", {})
        rain = bool(weather.get("rain"))
        fog = bool(weather.get("fog"))
        speed_cap = 0.55 if (rain and fog) else 0.65 if rain else 0.75 if fog else 1.0
        advisory = {
            "rain": rain, "fog": fog,
            "speed_cap_multiplier": speed_cap,
            "visibility_meters": 250 if fog else 600 if rain else 2000,
        }
        bus.publish("weather.advisory", advisory, sender=self.name)
        return AgentResult(
            agent_id=self.id,
            agent_name=self.name,
            purpose=self.purpose,
            input={"scenario": snapshot.get("scenario")},
            algorithm=self.algorithm,
            processing_steps=[
                "Read current scenario flags",
                "Pick macro-weather advisory",
                "Compute VSL cap and visibility",
                "Push to intersection controller candidates",
            ],
            decision="advise_speed_cap" if rain or fog else "no_advisory",
            reason=f"speed cap multiplier = {speed_cap}",
            confidence=0.96,
            execution_time_ms=0.0,
            communication_log=[{"topic": "weather.advisory", "consumers": ["intersection_controller", "safety_guard"]}],
            output=advisory,
            expected_impact="Reduces accident probability in adverse weather",
            status="ok", health="healthy",
            sdg_tags=list(self.sdg_tags),
        )
