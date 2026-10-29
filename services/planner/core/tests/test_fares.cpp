#include <catch2/catch_test_macros.hpp>

#include "helpers.hpp"
#include "mmr/fares.hpp"

using namespace mmr;
using test::leg;

TEST_CASE("transfer inside the window is free") {
  TransitFare fare;
  std::vector legs{leg(Mode::TRANSIT, 0, 20), leg(Mode::WALK, 20, 25), leg(Mode::TRANSIT, 25, 50)};
  CHECK(transit_fares(legs, fare) == std::vector{fare.flat, 0.0, 0.0});
}

TEST_CASE("boarding after the window pays again") {
  TransitFare fare;
  const double late = fare.transfer_window_min + 1;
  std::vector legs{leg(Mode::TRANSIT, 0, 20), leg(Mode::TRANSIT, late, late + 10)};
  CHECK(transit_fares(legs, fare) == std::vector{fare.flat, fare.flat});
}

TEST_CASE("boarding exactly at the window edge is free") {
  TransitFare fare;
  const double edge = fare.transfer_window_min;
  std::vector legs{leg(Mode::TRANSIT, 0, 20), leg(Mode::TRANSIT, edge, edge + 10)};
  CHECK(transit_fares(legs, fare) == std::vector{fare.flat, 0.0});
}
