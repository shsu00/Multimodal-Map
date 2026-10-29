"""Pick the itineraries worth showing: best on time vs money, then rank and label."""

from . import _native
from .models import Itinerary, Preferences

FASTEST = "Fastest"
CHEAPEST = "Cheapest"
BEST_BALANCE = "Best balance"


def dominates(a: Itinerary, b: Itinerary) -> bool:
    """a is at least as good as b on time and cost, and strictly better on one."""
    no_worse = a.duration_s <= b.duration_s and a.total_cost <= b.total_cost
    better = a.duration_s < b.duration_s or a.total_cost < b.total_cost
    return no_worse and better


def pareto_front(its: list[Itinerary]) -> list[Itinerary]:
    return [a for a in its if not any(dominates(b, a) for b in its if b is not a)]


def score(it: Itinerary, prefs: Preferences) -> float:
    """Generalised cost in money: lower is better."""
    hours = it.duration_s / 3600
    return it.total_cost + prefs.value_of_time_per_hour * hours + prefs.transfer_penalty * it.transfers


def _best_per_sequence(its: list[Itinerary], prefs: Preferences) -> list[Itinerary]:
    best: dict[tuple, Itinerary] = {}
    for it in its:
        cur = best.get(it.mode_sequence)
        if cur is None or score(it, prefs) < score(cur, prefs):
            best[it.mode_sequence] = it
    return list(best.values())


def rank(its: list[Itinerary], prefs: Preferences, limit: int = 5, min_results: int = 3) -> list[Itinerary]:
    """Pareto-optimal options with distinct mode sequences, topped up with the
    next-best alternatives when the front is very small."""
    if not _native.NATIVE:
        return _rank_py(its, prefs, limit, min_results)
    names = ((_native.FASTEST, FASTEST), (_native.CHEAPEST, CHEAPEST), (_native.BEST_BALANCE, BEST_BALANCE))
    chosen = []
    for i, bits in _native.rank(its, prefs, limit, min_results):
        its[i].labels = [name for bit, name in names if bits & bit]
        chosen.append(its[i])
    return chosen


def _rank_py(its: list[Itinerary], prefs: Preferences, limit: int, min_results: int) -> list[Itinerary]:
    if not its:
        return []
    distinct = _best_per_sequence(its, prefs)
    front = sorted(pareto_front(distinct), key=lambda it: score(it, prefs))
    if len(front) < min_results:
        rest = sorted((it for it in distinct if it not in front), key=lambda it: score(it, prefs))
        front += rest[: min_results - len(front)]
    chosen = front[:limit]

    for it in chosen:
        it.labels = []
    min(chosen, key=lambda it: it.duration_s).labels.append(FASTEST)
    min(chosen, key=lambda it: it.total_cost).labels.append(CHEAPEST)
    min(chosen, key=lambda it: score(it, prefs)).labels.append(BEST_BALANCE)
    return chosen
