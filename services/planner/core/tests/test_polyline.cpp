#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>
#include <stdexcept>

#include "mmr/polyline.hpp"

using namespace mmr;
using Catch::Matchers::WithinAbs;

// Example from Google's polyline algorithm documentation.
const std::vector<LatLon> GOOGLE_POINTS{{38.5, -120.2}, {40.7, -120.95}, {43.252, -126.453}};
const std::string GOOGLE_ENCODED = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

TEST_CASE("encode matches the reference string") { CHECK(encode_polyline(GOOGLE_POINTS) == GOOGLE_ENCODED); }

TEST_CASE("decode round-trips") {
  auto pts = decode_polyline(GOOGLE_ENCODED);
  REQUIRE(pts.size() == GOOGLE_POINTS.size());
  for (size_t i = 0; i < pts.size(); ++i) {
    CHECK_THAT(pts[i].first, WithinAbs(GOOGLE_POINTS[i].first, 1e-9));
    CHECK_THAT(pts[i].second, WithinAbs(GOOGLE_POINTS[i].second, 1e-9));
  }
}

TEST_CASE("empty and truncated input") {
  CHECK(encode_polyline({}).empty());
  CHECK(decode_polyline("").empty());
  CHECK_THROWS_AS(decode_polyline("_p~iF~ps|"), std::invalid_argument);
}
