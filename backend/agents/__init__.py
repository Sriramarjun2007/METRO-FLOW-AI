"""METRO-FLOW AI -- 20 Modular Agents.

Each agent is exposed through this package for use by the orchestrator.
"""

from .base_agent import AgentResult, BaseAgent, MessageBus

# Auto-import each agent so `from backend.agents import <Name>Agent` works.
from .vision_agent import VisionAgent
from .traffic_state_agent import TrafficStateAgent
from .sensor_trust_agent import SensorTrustAgent
from .weather_agent import WeatherAgent
from .intersection_controller_agent import IntersectionControllerAgent
from .neighbor_coordination_agent import NeighborCoordinationAgent
from .emergency_response_agent import EmergencyResponseAgent
from .public_transport_agent import PublicTransportAgent
from .event_management_agent import EventManagementAgent
from .prediction_agent import PredictionAgent
from .sustainability_agent import SustainabilityAgent
from .shadow_city_agent import ShadowCityAgent
from .urban_consensus_agent import UrbanConsensusAgent
from .explainable_ai_agent import ExplainableAIAgent
from .dashboard_agent import DashboardAgent
from .urbanverse_ai import UrbanVerseAI
from .alert_agent import AlertAgent
from .route_optimization_agent import RouteOptimizationAgent
from .safety_guard_agent import SafetyGuardAgent
from .analytics_agent import AnalyticsAgent

ALL_AGENTS = [
    VisionAgent,
    TrafficStateAgent,
    SensorTrustAgent,
    WeatherAgent,
    IntersectionControllerAgent,
    NeighborCoordinationAgent,
    EmergencyResponseAgent,
    PublicTransportAgent,
    EventManagementAgent,
    PredictionAgent,
    SustainabilityAgent,
    ShadowCityAgent,
    UrbanConsensusAgent,
    ExplainableAIAgent,
    DashboardAgent,
    UrbanVerseAI,
    AlertAgent,
    RouteOptimizationAgent,
    SafetyGuardAgent,
    AnalyticsAgent,
]

assert len(ALL_AGENTS) == 20, f"Expected 20 agents, found {len(ALL_AGENTS)}"
