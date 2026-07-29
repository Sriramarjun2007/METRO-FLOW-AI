"""Prediction Agent -- 5 / 10 / 30-minute forecasts."""

from __future__ import annotations

from .base_agent import AgentResult, BaseAgent, MessageBus
from ..algorithms.prediction import linear_forecast


class PredictionAgent(BaseAgent):
    name = "Prediction Agent"
    purpose = "Forecast queue, congestion, CO2 and travel time over the next 5/10/30 minutes."
    algorithm = "Linear-trend forecaster + confidence band"
    sdg_tags = [9, 11, 13]

    def __init__(self) -> None:
        super().__init__()
        self.series: dict[str, list[float]] = {
            "queue": [], "congestion": [], "delay": [], "co2": [], "fuel": [], "travel": [],
        }

    def _run(self, snapshot: dict, bus: MessageBus) -> AgentResult:
        metrics = snapshot["metrics"]
        self.series["queue"].append(sum(
            1 for iid, lanes in snapshot["lanes"].items()
            for lane in lanes.values() for v in lane["vehicles"] if v["velocity"] < 0.5
        ))
        self.series["congestion"].append(metrics["congestion_pct"])
        self.series["delay"].append(metrics["average_wait_seconds"])
        self.series["co2"].append(metrics["total_co2_kg"])
        self.series["fuel"].append(metrics["total_fuel_liters"])
        self.series["travel"].append(metrics["average_travel_seconds"])
        horizons = {"5m": 5, "10m": 10, "30m": 30}
        forecasts = {}
        for label, h in horizons.items():
            forecasts[label] = {
                "queue": linear_forecast(self.series["queue"][-30:], h)[0],
                "congestion": linear_forecast(self.series["congestion"][-30:], h)[0],
                "delay": linear_forecast(self.series["delay"][-30:], h)[0],
                "co2": linear_forecast(self.series["co2"][-30:], h)[0],
                "fuel": linear_forecast(self.series["fuel"][-30:], h)[0],
                "travel": linear_forecast(self.series["travel"][-30:], h)[0],
                "confidence": round(linear_forecast(self.series["congestion"][-30:], h)[1], 2),
            }
        bus.publish("prediction.forecast", forecasts, sender=self.name)
        return AgentResult(
            agent_id=self.id,
            agent_name=self.name,
            purpose=self.purpose,
            input={"history_length": min(30, len(self.series["congestion"]))},
            algorithm=self.algorithm,
            processing_steps=[
                "Maintain rolling 30-tick window per metric",
                "Linear regression to forecast horizon",
                "Compute confidence band",
                "Publish for dashboard + alerts",
            ],
            decision="publish_forecast",
            reason="Forecast generated for 5/10/30-minute horizons",
            confidence=0.87,
            execution_time_ms=0.0,
            communication_log=[{"topic": "prediction.forecast", "consumers": ["dashboard", "alert"]}],
            output=forecasts,
            expected_impact="Enables proactive signal & dispatch decisions",
            status="ok", health="healthy",
            sdg_tags=list(self.sdg_tags),
        )
