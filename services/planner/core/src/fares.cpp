#include "mmr/fares.hpp"

#include <optional>

namespace mmr {

std::vector<double> transit_fares(const std::vector<Leg>& legs, const TransitFare& fare) {
  const double window_s = fare.transfer_window_min * 60.0;
  std::optional<double> paid_at;
  std::vector<double> costs;
  costs.reserve(legs.size());
  for (const auto& leg : legs) {
    if (leg.mode != Mode::TRANSIT) {
      costs.push_back(0.0);
    } else if (paid_at && leg.start_s - *paid_at <= window_s) {
      costs.push_back(0.0);
    } else {
      paid_at = leg.start_s;
      costs.push_back(fare.flat);
    }
  }
  return costs;
}

}  // namespace mmr
