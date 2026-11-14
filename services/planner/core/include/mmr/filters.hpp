// Constraint filters applied before ranking (planner/planner.py).
#pragma once

#include "mmr/types.hpp"

namespace mmr {

bool satisfies(const Itinerary& it, const Prefs& prefs);

// Walking is always fine as a connector, but a walk-only trip needs WALK allowed.
bool uses_allowed_modes(const Itinerary& it, ModeMask allowed);

}  // namespace mmr
