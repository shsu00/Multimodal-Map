#include <catch2/catch_test_macros.hpp>

#include "helpers.hpp"
#include "mmr/pareto.hpp"

using namespace mmr;
using test::itin;

TEST_CASE("dominance") {
  CHECK(dominates(itin(10, 5), itin(20, 5)));
  CHECK_FALSE(dominates(itin(10, 5), itin(10, 5)));
  CHECK_FALSE(dominates(itin(10, 9), itin(20, 5)));
}

TEST_CASE("front drops dominated options, keeps ties") {
  std::vector its{itin(10, 20), itin(60, 0), itin(70, 25), itin(10, 20), itin(10, 21)};
  CHECK(pareto_front(its) == std::vector<size_t>{0, 1, 3});
}

TEST_CASE("labels") {
  std::vector its{itin(10, 20, {Mode::TAXI}), itin(60, 0, {Mode::WALK}),
                  itin(25, 2.75, {Mode::WALK, Mode::TRANSIT, Mode::WALK})};
  Prefs prefs;
  prefs.value_of_time_per_hour = 15;
  auto out = rank(its, prefs);
  REQUIRE(out.size() == 3);
  CHECK(out[0].index == 2);
  CHECK(out[0].labels == BEST_BALANCE);
  for (const auto& r : out) {
    if (r.index == 0) CHECK(r.labels == FASTEST);
    if (r.index == 1) CHECK(r.labels == CHEAPEST);
  }
}

TEST_CASE("value of time changes the winner") {
  std::vector its{itin(10, 20, {Mode::TAXI}), itin(40, 2.75, {Mode::WALK, Mode::TRANSIT, Mode::WALK})};
  Prefs prefs;
  prefs.value_of_time_per_hour = 5;
  CHECK(rank(its, prefs)[0].index == 1);
  prefs.value_of_time_per_hour = 100;
  CHECK(rank(its, prefs)[0].index == 0);
}

TEST_CASE("one result per mode sequence") {
  std::vector its{itin(20, 2.75, {Mode::WALK, Mode::TRANSIT, Mode::WALK}),
                  itin(30, 2.75, {Mode::WALK, Mode::TRANSIT, Mode::WALK})};
  auto out = rank(its, Prefs{});
  REQUIRE(out.size() == 1);
  CHECK(out[0].index == 0);
  CHECK(out[0].labels == (FASTEST | CHEAPEST | BEST_BALANCE));
}

TEST_CASE("small front is topped up with dominated alternatives") {
  std::vector its{itin(10, 1, {Mode::BIKE}), itin(20, 5, {Mode::TAXI}), itin(30, 8, {Mode::CAR})};
  auto out = rank(its, Prefs{});
  REQUIRE(out.size() == 3);
  CHECK(out[0].index == 0);
  CHECK(out[1].index == 1);
  CHECK(out[2].index == 2);
}

TEST_CASE("empty input") { CHECK(rank({}, Prefs{}).empty()); }
