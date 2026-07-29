"""Vision Agent -- YOLOv8-simulated object detector.

Ingests the simulator's per-tick vehicle snapshot, classifies each
detected vehicle by class (car, bus, pedestrian, ...) and publishes a
structured detection summary to the bus. In the real platform this
would consume CCTV frames; here we wrap the simulator's already
classified vehicle list in the YOLOv8 output schema so downstream
agents (Traffic State, Sensor Trust, Dashboard) can subscribe to it.
"""

from __future__ import annotations

import uuid
from typing import Any

from .base_agent import AgentResult, BaseAgent, MessageBus


class VisionAgent(BaseAgent):
    name = "Vision Agent"
    purpose = "Detect and classify vehicles, pedestrians, and anomalies in live imagery."
    algorithm = "YOLOv8 + OpenCV preprocessing"
    sdg_tags = [9, 11]

    def _run(self, snapshot: dict, bus: MessageBus) -> AgentResult:
        vehicles = snapshot.get("vehicles", [])
        counts: dict[str, int] = {}
        emergencies: list[str] = []
        for v in vehicles:
            counts[v["type"]] = counts.get(v["type"], 0) + 1
            if v.get("is_emergency"):
                emergencies.append(v["id"])
        confidence = min(0.99, 0.85 + 0.001 * len(vehicles))
        steps = [
            "Ingest CCTV tiles (250x250 grid)",
            "OpenCV denoise + luminance normalization",
            "YOLOv8 forward pass -> bounding boxes",
            "NMS filter confidence > 0.5",
            "Aggregate per-class counts and publish",
        ]
        decision = "publish_detections" if vehicles else "idle"
        output = {"counts": counts, "emergencies": emergencies, "frame_id": str(uuid.uuid4())[:8]}
        bus.publish("vision.detections", output, sender=self.name)
        return AgentResult(
            agent_id=self.id,
            agent_name=self.name,
            purpose=self.purpose,
            input={"vehicles_in_frame": len(vehicles)},
            algorithm=self.algorithm,
            processing_steps=steps,
            decision=decision,
            reason=f"Detected {len(vehicles)} entities with confidence {round(confidence,2)}",
            confidence=confidence,
            execution_time_ms=0.0,
            communication_log=[{"topic": "vision.detections", "subscribers": ["traffic_state", "sensor_trust"]}],
            output=output,
            expected_impact="Upstream data for traffic state estimation & alert triggers",
            status="ok", health="healthy",
            sdg_tags=list(self.sdg_tags),
        )
