"""Pathfinding algorithms used by the route optimization agent."""

from __future__ import annotations

import heapq
from typing import Callable, Optional


def dijkstra(graph: dict[str, dict[str, float]], start: str, goal: str) -> tuple[list[str], float]:
    """Classic Dijkstra shortest-path; returns route + cumulative cost."""
    distances: dict[str, float] = {n: float("inf") for n in graph}
    distances[start] = 0.0
    prev: dict[str, Optional[str]] = {n: None for n in graph}
    pq: list[tuple[float, str]] = [(0.0, start)]
    visited: set[str] = set()

    while pq:
        d, node = heapq.heappop(pq)
        if node in visited:
            continue
        visited.add(node)
        if node == goal:
            break
        for nb, w in graph.get(node, {}).items():
            nd = d + w
            if nd < distances[nb]:
                distances[nb] = nd
                prev[nb] = node
                heapq.heappush(pq, (nd, nb))

    if distances[goal] == float("inf"):
        return [], float("inf")

    route: list[str] = []
    cur: Optional[str] = goal
    while cur is not None:
        route.append(cur)
        cur = prev[cur]
    route.reverse()
    return route, distances[goal]


def astar(graph: dict[str, dict[str, float]], start: str, goal: str, heuristic: Callable[[str, str], float]) -> tuple[list[str], float]:
    """A* search with a user-supplied heuristic."""
    g: dict[str, float] = {n: float("inf") for n in graph}
    g[start] = 0.0
    f: dict[str, float] = {n: float("inf") for n in graph}
    f[start] = heuristic(start, goal)
    prev: dict[str, Optional[str]] = {n: None for n in graph}
    open_set: list[tuple[float, str]] = [(f[start], start)]
    closed: set[str] = set()

    while open_set:
        _, node = heapq.heappop(open_set)
        if node in closed:
            continue
        closed.add(node)
        if node == goal:
            break
        for nb, w in graph.get(node, {}).items():
            tentative = g[node] + w
            if tentative < g[nb]:
                g[nb] = tentative
                f[nb] = tentative + heuristic(nb, goal)
                prev[nb] = node
                heapq.heappush(open_set, (f[nb], nb))

    if g[goal] == float("inf"):
        return [], float("inf")
    route: list[str] = []
    cur: Optional[str] = goal
    while cur is not None:
        route.append(cur)
        cur = prev[cur]
    route.reverse()
    return route, g[goal]
