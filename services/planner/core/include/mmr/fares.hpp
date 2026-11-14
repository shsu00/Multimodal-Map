// Transit fare engine (planner/fares.py). Fares are journey-level:
// boardings inside the transfer window of the paid one are free.
#pragma once

#include "mmr/types.hpp"

namespace mmr {

// Cost of each leg's boarding (0 for non-transit legs and free transfers).
std::vector<double> transit_fares(const std::vector<Leg>& legs, const TransitFare& fare);

}  // namespace mmr
