"""Time-series prediction + supporting algorithms.

The Prediction Agent uses a moving-average + linear-trend forecaster (with
confidence intervals) to estimate future queue, congestion, CO2, and
fuel use for the next 5/10/30 minutes.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Forecast:
    horizon_minutes: int
    queue: float
    congestion: float
    delay_seconds: float
    co2_kg: float
    fuel_liters: float
    travel_seconds: float
    confidence: float

    def to_dict(self) -> dict:
        return {
            "horizon_minutes": self.horizon_minutes,
            "queue": round(self.queue, 1),
            "congestion": round(self.congestion, 1),
            "delay_seconds": round(self.delay_seconds, 1),
            "co2_kg": round(self.co2_kg, 2),
            "fuel_liters": round(self.fuel_liters, 2),
            "travel_seconds": round(self.travel_seconds, 1),
            "confidence": round(self.confidence, 2),
        }


def linear_forecast(series: list[float], horizon_minutes: int) -> tuple[float, float]:
    """Linear-extrapolation forecast with confidence 0..1.

    The confidence degrades sharply with the horizon and increases with the
    smoothness of the series.
    """
    if not series:
        return 0.0, 0.0
    if len(series) == 1:
        return series[0], 0.5
    # simple least-squares trend
    n = len(series)
    xs = list(range(n))
    x_mean = sum(xs) / n
    y_mean = sum(series) / n
    num = sum((xs[i] - x_mean) * (series[i] - y_mean) for i in range(n))
    den = sum((xs[i] - x_mean) ** 2 for i in range(n)) or 1e-9
    slope = num / den
    intercept = y_mean - slope * x_mean
    forecast = intercept + slope * (n + horizon_minutes - 1)

    # confidence: penalized by horizon, boosted by low variance
    var = sum((series[i] - y_mean) ** 2 for i in range(n)) / n
    smoothness = max(0.0, 1.0 - min(1.0, var / max(1.0, abs(y_mean))))
    horizon_decay = max(0.1, 1.0 - horizon_minutes / 60.0)
    confidence = 0.4 + 0.5 * smoothness * horizon_decay
    return max(0.0, forecast), min(0.99, confidence)


def traffic_density(vehicle_count: int, capacity: int) -> float:
    """0..1 occupancy of a lane or network segment."""
    if capacity <= 0:
        return 0.0
    return min(1.0, vehicle_count / capacity)


def sensor_trust(failure_rate: float, noise: float = 0.05) -> float:
    """0..1 trust score inversely related to failure rate and noise."""
    return max(0.0, min(1.0, 1.0 - failure_rate - noise))


def hit_collision(a_pos: float, a_len: float, b_pos: float, b_len: float, margin: float = 1.0) -> bool:
    """Geometric overlap check used by the Safety Guard Agent."""
    a_start, a_end = a_pos, a_pos + a_len
    b_start, b_end = b_pos, b_pos + b_len
    return not (a_end + margin < b_start or b_end + margin < a_start)


def green_wave_propagation(signal_timings: dict[str, float], distance: float, avg_speed: float) -> float:
    """Estimated bandwidth (s) of a virtual green-wave along distance."""
    if avg_speed <= 0:
        return 0.0
    travel = distance / avg_speed
    return max(0.0, min(signal_timings.get("green", 12.0), signal_timings.get("green", 12.0) - travel))
