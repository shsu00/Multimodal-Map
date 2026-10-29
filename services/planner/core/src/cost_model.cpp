#include "mmr/cost_model.hpp"

#include <algorithm>
#include <cstdio>
#include <cstdlib>

#include "mmr/fares.hpp"

namespace mmr {

namespace {

double rental(const Leg& leg, const RentalPricing& p) { return p.unlock + p.per_min * leg.duration_s() / 60; }

}  // namespace

// Expressions keep cost_model.py's operation order so results match it bit for bit.
double leg_cost(const Leg& leg, const CityPrices& city, double stay_hours, bool is_last_car_leg) {
  const double km = leg.distance_m / 1000;
  switch (leg.mode) {
    case Mode::CAR: {
      const double fuel = km * city.car_l_per_100km / 100 * city.fuel_price_per_l;
      if (leg.parked_after) return fuel + city.pnr_parking_flat;
      if (is_last_car_leg) return fuel + city.parking_per_hour * stay_hours;
      return fuel;
    }
    case Mode::TAXI: {
      const auto& t = city.taxi;
      return std::max(t.min_fare, t.base + t.per_km * km + t.per_min * leg.duration_s() / 60);
    }
    case Mode::BIKE:
      return leg.rented ? rental(leg, city.bike_rental) : 0.0;
    case Mode::SCOOTER:
      return rental(leg, city.scooter_rental);
    default:
      return 0.0;
  }
}

double round_cents(double x) {
  // x * 100 can land on the wrong side of .5; printf rounds the exact binary value instead.
  char buf[64];
  std::snprintf(buf, sizeof buf, "%.2f", x);
  return std::strtod(buf, nullptr);
}

void price_itinerary(Itinerary& it, const CityPrices& city, double stay_hours) {
  const auto fares = transit_fares(it.legs, city.transit_fare);
  int last_car = -1;
  for (size_t i = 0; i < it.legs.size(); ++i)
    if (it.legs[i].mode == Mode::CAR) last_car = static_cast<int>(i);

  double total = 0;
  bool estimated = false;
  for (size_t i = 0; i < it.legs.size(); ++i) {
    auto& leg = it.legs[i];
    if (leg.mode == Mode::TRANSIT)
      leg.cost = fares[i];
    else
      leg.cost = leg_cost(leg, city, stay_hours, static_cast<int>(i) == last_car);
    total += leg.cost;
    estimated = estimated || leg.mode == Mode::TAXI || leg.mode == Mode::CAR;
  }
  it.total_cost = round_cents(total);
  it.estimated_cost = estimated;
}

}  // namespace mmr
