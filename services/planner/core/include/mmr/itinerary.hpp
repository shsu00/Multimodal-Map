// Derived itinerary properties, same definitions as Itinerary in models.py.
#pragma once

#include "mmr/types.hpp"

namespace mmr {

double duration_s(const Itinerary& it);
int transfers(const Itinerary& it);
double walk_m(const Itinerary& it);
double co2_g(const Itinerary& it);

// Modes in order with consecutive repeats collapsed, e.g. WALK, TRANSIT, WALK.
std::vector<Mode> mode_sequence(const Itinerary& it);

// Grams of CO2 per passenger-km (planner/modes.py CO2_G_PER_KM).
double co2_g_per_km(Mode m);

}  // namespace mmr
