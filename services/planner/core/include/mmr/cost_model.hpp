// Per-leg pricing (planner/cost_model.py).
#pragma once

#include "mmr/types.hpp"

namespace mmr {

// Price of a non-transit leg. Transit is priced per journey in fares.hpp.
double leg_cost(const Leg& leg, const CityPrices& city, double stay_hours, bool is_last_car_leg);

// Fills each leg's cost, total_cost (rounded to cents) and estimated_cost.
void price_itinerary(Itinerary& it, const CityPrices& city, double stay_hours);

// round(x, 2) with Python's semantics: correctly rounded, ties to even.
double round_cents(double x);

}  // namespace mmr
