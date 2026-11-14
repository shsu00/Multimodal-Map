from conftest import itin
from planner.models import Preferences
from planner.modes import Mode
from planner.pareto import BEST_BALANCE, CHEAPEST, FASTEST, dominates, pareto_front, rank


def test_dominance():
    assert dominates(itin(10, 5), itin(20, 5))
    assert not dominates(itin(10, 5), itin(10, 5))
    assert not dominates(itin(10, 9), itin(20, 5))


def test_front_drops_dominated():
    fast, cheap, bad = itin(10, 20), itin(60, 0), itin(70, 25)
    assert pareto_front([fast, cheap, bad]) == [fast, cheap]


def test_labels():
    fast = itin(10, 20, (Mode.TAXI,))
    cheap = itin(60, 0, (Mode.WALK,))
    mid = itin(25, 2.75, (Mode.WALK, Mode.TRANSIT, Mode.WALK))
    out = rank([fast, cheap, mid], Preferences(value_of_time_per_hour=15))
    assert FASTEST in fast.labels
    assert CHEAPEST in cheap.labels
    assert BEST_BALANCE in mid.labels
    assert out[0] is mid


def test_value_of_time_changes_winner():
    fast = itin(10, 20, (Mode.TAXI,))
    slow = itin(40, 2.75, (Mode.WALK, Mode.TRANSIT, Mode.WALK))
    rank([fast, slow], Preferences(value_of_time_per_hour=5))
    assert BEST_BALANCE in slow.labels
    rank([fast, slow], Preferences(value_of_time_per_hour=100))
    assert BEST_BALANCE in fast.labels


def test_one_result_per_mode_sequence():
    a = itin(20, 2.75, (Mode.WALK, Mode.TRANSIT, Mode.WALK))
    b = itin(30, 2.75, (Mode.WALK, Mode.TRANSIT, Mode.WALK))
    assert rank([a, b], Preferences()) == [a]
