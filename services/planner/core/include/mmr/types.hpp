// Plain data shared by the whole core. Mirrors planner/models.py and
// planner/config.py, minus geometry and names, which stay in Python.
#pragma once

#include <cstdint>
#include <vector>

namespace mmr {

enum class Mode : uint8_t { WALK, BIKE, SCOOTER, CAR, TAXI, TRANSIT };

// Set of modes as bits: 1 << Mode.
using ModeMask = uint8_t;
constexpr ModeMask bit(Mode m) { return static_cast<ModeMask>(1u << static_cast<unsigned>(m)); }

struct Leg {
  Mode mode = Mode::WALK;
  double start_s = 0;  // seconds since a reference time shared by the itinerary
  double end_s = 0;
  double distance_m = 0;
  bool rented = false;
  bool parked_after = false;  // car is left at a park & ride after this leg
  double cost = 0;

  double duration_s() const { return end_s - start_s; }
};

struct Itinerary {
  std::vector<Leg> legs;
  double total_cost = 0;
  bool estimated_cost = false;
};

struct Prefs {
  double value_of_time_per_hour = 15.0;
  double transfer_penalty = 1.0;
  double max_walk_m = 2000.0;
  int max_transfers = 3;
};

struct TaxiPricing {
  double base = 3.0, per_km = 1.8, per_min = 0.4, min_fare = 8.0;
};

struct RentalPricing {
  double unlock = 1.0, per_min = 0.35;
};

struct TransitFare {
  double flat = 2.75;
  int transfer_window_min = 120;
};

struct CityPrices {
  double fuel_price_per_l = 1.8;
  double car_l_per_100km = 8.0;
  double parking_per_hour = 4.0;
  double pnr_parking_flat = 5.0;
  TaxiPricing taxi;
  RentalPricing bike_rental{1.0, 0.2};
  RentalPricing scooter_rental;
  TransitFare transit_fare;
};

}  // namespace mmr
