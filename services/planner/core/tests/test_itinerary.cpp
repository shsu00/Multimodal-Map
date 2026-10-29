#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include "helpers.hpp"
#include "mmr/filters.hpp"
#include "mmr/itinerary.hpp"

using namespace mmr;
using test::leg;
using Catch::Matchers::WithinAbs;

TEST_CASE("derived properties") {
  Itinerary it{{leg(Mode::WALK, 0, 5, 400), leg(Mode::TRANSIT, 5, 20, 6000), leg(Mode::TRANSIT, 22, 30, 3000),
                leg(Mode::WALK, 30, 34, 300)}};
  CHECK(duration_s(it) == 34 * 60);
  CHECK(transfers(it) == 1);
  CHECK(walk_m(it) == 700);
  CHECK_THAT(co2_g(it), WithinAbs(9 * 60, 1e-9));
  CHECK(mode_sequence(it) == std::vector{Mode::WALK, Mode::TRANSIT, Mode::WALK});
}

TEST_CASE("constraints") {
  Itinerary it{{leg(Mode::WALK, 0, 30, 2500)}};
  Prefs prefs;
  CHECK_FALSE(satisfies(it, prefs));
  prefs.max_walk_m = 3000;
  CHECK(satisfies(it, prefs));
}

TEST_CASE("allowed modes: walking connects, but walk-only needs WALK") {
  Itinerary transit{{leg(Mode::WALK, 0, 5), leg(Mode::TRANSIT, 5, 20), leg(Mode::WALK, 20, 25)}};
  Itinerary walk_only{{leg(Mode::WALK, 0, 40)}};
  CHECK(uses_allowed_modes(transit, bit(Mode::TRANSIT)));
  CHECK_FALSE(uses_allowed_modes(transit, bit(Mode::CAR)));
  CHECK_FALSE(uses_allowed_modes(walk_only, bit(Mode::SCOOTER)));
  CHECK(uses_allowed_modes(walk_only, bit(Mode::WALK) | bit(Mode::SCOOTER)));
}
