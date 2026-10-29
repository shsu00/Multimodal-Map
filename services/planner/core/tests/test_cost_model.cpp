#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include "helpers.hpp"
#include "mmr/cost_model.hpp"

using namespace mmr;
using test::leg;
using Catch::Matchers::WithinAbs;

TEST_CASE("car: fuel plus destination parking") {
  CityPrices city;
  Itinerary it{{leg(Mode::CAR, 0, 20, 10'000)}};
  price_itinerary(it, city, 2);
  const double fuel = 10 * city.car_l_per_100km / 100 * city.fuel_price_per_l;
  CHECK_THAT(it.total_cost, WithinAbs(fuel + 2 * city.parking_per_hour, 0.01));
  CHECK(it.estimated_cost);
}

TEST_CASE("park and ride uses the flat lot price") {
  CityPrices city;
  Itinerary it{{leg(Mode::CAR, 0, 10, 5000, false, true), leg(Mode::TRANSIT, 15, 40), leg(Mode::WALK, 40, 45)}};
  price_itinerary(it, city, 8);
  const double fuel = 5 * city.car_l_per_100km / 100 * city.fuel_price_per_l;
  CHECK_THAT(it.legs[0].cost, WithinAbs(fuel + city.pnr_parking_flat, 1e-9));
  CHECK(it.legs[1].cost == city.transit_fare.flat);
}

TEST_CASE("taxi minimum fare") {
  CityPrices city;
  Itinerary it{{leg(Mode::TAXI, 0, 2, 300)}};
  price_itinerary(it, city, 0);
  CHECK(it.total_cost == city.taxi.min_fare);
}

TEST_CASE("own bike is free, rental is charged") {
  CityPrices city;
  Itinerary own{{leg(Mode::BIKE, 0, 10)}};
  Itinerary rented{{leg(Mode::BIKE, 0, 10, 1000, true)}};
  price_itinerary(own, city, 0);
  price_itinerary(rented, city, 0);
  CHECK(own.total_cost == 0);
  CHECK_THAT(rented.total_cost, WithinAbs(city.bike_rental.unlock + 10 * city.bike_rental.per_min, 1e-9));
  CHECK_FALSE(rented.estimated_cost);
}

TEST_CASE("round_cents matches Python round(x, 2)") {
  CHECK(round_cents(2.675) == 2.67);  // stored just below .675
  CHECK(round_cents(0.125) == 0.12);  // exact tie goes to even
  CHECK(round_cents(0.375) == 0.38);
  CHECK(round_cents(10.0) == 10.0);
}
