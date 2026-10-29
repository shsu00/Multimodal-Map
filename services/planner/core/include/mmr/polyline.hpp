// Google encoded polyline, precision 5 (the format OTP returns).
#pragma once

#include <string>
#include <string_view>
#include <utility>
#include <vector>

namespace mmr {

using LatLon = std::pair<double, double>;

std::string encode_polyline(const std::vector<LatLon>& points);

// Throws std::invalid_argument on a truncated string.
std::vector<LatLon> decode_polyline(std::string_view encoded);

}  // namespace mmr
