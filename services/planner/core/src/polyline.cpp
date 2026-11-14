#include "mmr/polyline.hpp"

#include <cmath>
#include <cstdint>
#include <stdexcept>

namespace mmr {

namespace {

void put(std::string& out, int64_t delta) {
  // C++20 defines left shift of negatives, matching Python's ~(delta << 1).
  uint64_t v = static_cast<uint64_t>(delta < 0 ? ~(delta << 1) : delta << 1);
  while (v >= 0x20) {
    out.push_back(static_cast<char>((0x20 | (v & 0x1f)) + 63));
    v >>= 5;
  }
  out.push_back(static_cast<char>(v + 63));
}

int64_t take(std::string_view s, size_t& i) {
  uint64_t result = 0;
  int shift = 0;
  int byte;
  do {
    if (i >= s.size() || shift > 60) throw std::invalid_argument("truncated polyline");
    byte = s[i++] - 63;
    result |= static_cast<uint64_t>(byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);
  return (result & 1) ? ~static_cast<int64_t>(result >> 1) : static_cast<int64_t>(result >> 1);
}

}  // namespace

std::string encode_polyline(const std::vector<LatLon>& points) {
  std::string out;
  int64_t prev_lat = 0, prev_lon = 0;
  for (const auto& [lat_deg, lon_deg] : points) {
    // nearbyint rounds half to even, like Python's round().
    auto lat = static_cast<int64_t>(std::nearbyint(lat_deg * 1e5));
    auto lon = static_cast<int64_t>(std::nearbyint(lon_deg * 1e5));
    put(out, lat - prev_lat);
    put(out, lon - prev_lon);
    prev_lat = lat;
    prev_lon = lon;
  }
  return out;
}

std::vector<LatLon> decode_polyline(std::string_view encoded) {
  std::vector<LatLon> points;
  int64_t lat = 0, lon = 0;
  size_t i = 0;
  while (i < encoded.size()) {
    lat += take(encoded, i);
    lon += take(encoded, i);
    points.emplace_back(lat / 1e5, lon / 1e5);
  }
  return points;
}

}  // namespace mmr
