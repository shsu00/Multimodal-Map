#include "mmr/itinerary.hpp"

#include <algorithm>

namespace mmr {

double duration_s(const Itinerary& it) {
  if (it.legs.empty()) return 0;
  return it.legs.back().end_s - it.legs.front().start_s;
}

int transfers(const Itinerary& it) {
  auto rides = std::count_if(it.legs.begin(), it.legs.end(), [](const Leg& l) { return l.mode == Mode::TRANSIT; });
  return std::max(0, static_cast<int>(rides) - 1);
}

double walk_m(const Itinerary& it) {
  double total = 0;
  for (const auto& l : it.legs)
    if (l.mode == Mode::WALK) total += l.distance_m;
  return total;
}

double co2_g_per_km(Mode m) {
  switch (m) {
    case Mode::SCOOTER: return 35;
    case Mode::CAR:
    case Mode::TAXI: return 170;
    case Mode::TRANSIT: return 60;
    default: return 0;
  }
}

double co2_g(const Itinerary& it) {
  double total = 0;
  for (const auto& l : it.legs) total += co2_g_per_km(l.mode) * l.distance_m / 1000;
  return total;
}

std::vector<Mode> mode_sequence(const Itinerary& it) {
  std::vector<Mode> seq;
  for (const auto& l : it.legs)
    if (seq.empty() || seq.back() != l.mode) seq.push_back(l.mode);
  return seq;
}

}  // namespace mmr
