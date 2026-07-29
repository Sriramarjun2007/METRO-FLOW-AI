"""Intersection model with stateful traffic signals.

Each intersection has 4 incoming lanes (N/S/E/W), each with a signal whose
phase cycle drives vehicle crossing. UCP proposes green extensions and the
Intersection Controller executes them.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class SignalColor(str, Enum):
    RED = "red"
    YELLOW = "yellow"
    GREEN = "green"


@dataclass
class Signal:
    direction: str
    color: SignalColor = SignalColor.RED
    phase_started_at: float = field(default_factory=time.time)
    extension_seconds: float = 0.0

    def age_seconds(self, now: float) -> float:
        return now - self.phase_started_at

    def to_dict(self) -> dict:
        return {
            "direction": self.direction,
            "color": self.color.value,
            "age_seconds": round(self.age_seconds(time.time()), 2),
            "extension_seconds": self.extension_seconds,
        }


@dataclass
class Intersection:
    """A four-way intersection with a 4-phase traffic controller."""

    id: str
    x: float
    y: float
    cycle_seconds: float = 60.0
    green_seconds: float = 12.0
    yellow_seconds: float = 3.0
    main_axis: tuple[str, str] = ("north", "south")
    signals: dict[str, Signal] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.signals:
            for d in ("north", "south", "east", "west"):
                initial = SignalColor.GREEN if d in self.main_axis else SignalColor.RED
                self.signals[d] = Signal(direction=d, color=initial)

    def tick(self, dt: float, now: float) -> None:
        """Advance the signal phases. The list of directions acts as a
        rotating cycle. Yellow is rendered for yellow_seconds; then the axis
        flips."""
        for sig in self.signals.values():
            sig.extension_seconds = max(0.0, sig.extension_seconds - dt)
            age = sig.age_seconds(now)
            # compute expected duration for its current color
            if sig.color == SignalColor.YELLOW:
                if age >= self.yellow_seconds:
                    self._flip(sig, now)
            elif sig.color == SignalColor.GREEN:
                if age >= self.green_seconds + sig.extension_seconds:
                    sig.color = SignalColor.YELLOW
                    sig.phase_started_at = now
                    sig.extension_seconds = 0.0

    def _flip(self, sig: Signal, now: float) -> None:
        other_color = (
            SignalColor.RED if sig.color == SignalColor.GREEN else SignalColor.GREEN
        )
        # cross flip: the partner axis gets the same new state
        partner = None
        for other_sig in self.signals.values():
            if other_sig.direction != sig.direction and other_sig.color != sig.color:
                partner = other_sig
                break
        sig.color = other_color
        sig.phase_started_at = now
        if partner:
            partner.color = other_color
            partner.phase_started_at = now

    def apply_extension(self, direction: str, seconds: float, now: float) -> None:
        sig = self.signals[direction]
        if sig.color == SignalColor.GREEN:
            sig.extension_seconds = max(sig.extension_seconds, seconds)

    def density(self) -> dict[str, int]:
        """Filled in by the simulator -- kept on the intersection object for
        easy introspection."""
        return getattr(self, "_density", {})

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "x": self.x,
            "y": self.y,
            "cycle_seconds": self.cycle_seconds,
            "green_seconds": self.green_seconds,
            "yellow_seconds": self.yellow_seconds,
            "signals": {k: v.to_dict() for k, v in self.signals.items()},
            "density": self.density(),
        }
