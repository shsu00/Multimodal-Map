// Builders mirroring tests/conftest.py.
#pragma once

#include <initializer_list>

#include "mmr/types.hpp"

namespace mmr::test {

inline Leg leg(Mode mode, double start_min, double end_min, double distance_m = 1000, bool rented = false,
               bool parked_after = false) {
  return Leg{mode, start_min * 60, end_min * 60, distance_m, rented, parked_after, 0.0};
}

// Legs of equal length covering `minutes`, with a preset total cost.
inline Itinerary itin(double minutes, double cost, std::initializer_list<Mode> modes = {Mode::WALK}) {
  Itinerary it;
  const double step = minutes / modes.size();
  int i = 0;
  for (Mode m : modes) {
    it.legs.push_back(leg(m, i * step, (i + 1) * step));
    ++i;
  }
  it.total_cost = cost;
  return it;
}

}  // namespace mmr::test
