#include "mmr/filters.hpp"

#include "mmr/itinerary.hpp"

namespace mmr {

bool satisfies(const Itinerary& it, const Prefs& prefs) {
  return walk_m(it) <= prefs.max_walk_m && transfers(it) <= prefs.max_transfers;
}

bool uses_allowed_modes(const Itinerary& it, ModeMask allowed) {
  ModeMask used = 0;
  for (const auto& l : it.legs) used |= bit(l.mode);
  const ModeMask walk = bit(Mode::WALK);
  if (used == walk) return allowed & walk;
  return (used & ~walk & ~allowed) == 0;
}

}  // namespace mmr
