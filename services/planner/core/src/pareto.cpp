#include "mmr/pareto.hpp"

#include <algorithm>
#include <limits>
#include <map>
#include <numeric>

#include "mmr/itinerary.hpp"

namespace mmr {

bool dominates(const Itinerary& a, const Itinerary& b) {
  const double ta = duration_s(a), tb = duration_s(b);
  const bool no_worse = ta <= tb && a.total_cost <= b.total_cost;
  const bool better = ta < tb || a.total_cost < b.total_cost;
  return no_worse && better;
}

std::vector<size_t> pareto_front(const std::vector<Itinerary>& its) {
  const size_t n = its.size();
  std::vector<double> t(n);
  for (size_t i = 0; i < n; ++i) t[i] = duration_s(its[i]);

  std::vector<size_t> order(n);
  std::iota(order.begin(), order.end(), 0);
  std::sort(order.begin(), order.end(), [&](size_t a, size_t b) {
    return t[a] != t[b] ? t[a] < t[b] : its[a].total_cost < its[b].total_cost;
  });

  // Sweep groups of equal duration. An item is dominated by anything strictly
  // faster that is no dearer, or by anything equally fast that is cheaper.
  std::vector<bool> keep(n, false);
  double cheapest_faster = std::numeric_limits<double>::infinity();
  for (size_t g = 0; g < n;) {
    size_t end = g;
    while (end < n && t[order[end]] == t[order[g]]) ++end;
    const double group_min = its[order[g]].total_cost;
    for (size_t k = g; k < end; ++k) {
      const double c = its[order[k]].total_cost;
      keep[order[k]] = !(cheapest_faster <= c || group_min < c);
    }
    cheapest_faster = std::min(cheapest_faster, group_min);
    g = end;
  }

  std::vector<size_t> front;
  for (size_t i = 0; i < n; ++i)
    if (keep[i]) front.push_back(i);
  return front;
}

double score(const Itinerary& it, const Prefs& prefs) {
  const double hours = duration_s(it) / 3600;
  return it.total_cost + prefs.value_of_time_per_hour * hours + prefs.transfer_penalty * transfers(it);
}

namespace {

// Best-scoring itinerary per mode sequence, ordered by each sequence's first appearance.
std::vector<size_t> best_per_sequence(const std::vector<Itinerary>& its, const std::vector<double>& scores) {
  std::map<std::vector<Mode>, size_t> slot;
  std::vector<size_t> best;
  for (size_t i = 0; i < its.size(); ++i) {
    auto [pos, inserted] = slot.try_emplace(mode_sequence(its[i]), best.size());
    if (inserted)
      best.push_back(i);
    else if (scores[i] < scores[best[pos->second]])
      best[pos->second] = i;
  }
  return best;
}

}  // namespace

std::vector<Ranked> rank(const std::vector<Itinerary>& its, const Prefs& prefs, size_t limit, size_t min_results) {
  if (its.empty()) return {};
  std::vector<double> scores(its.size());
  for (size_t i = 0; i < its.size(); ++i) scores[i] = score(its[i], prefs);
  auto by_score = [&](size_t a, size_t b) { return scores[a] < scores[b]; };

  const auto distinct = best_per_sequence(its, scores);
  std::vector<Itinerary> subset;
  subset.reserve(distinct.size());
  for (size_t i : distinct) subset.push_back(its[i]);

  std::vector<size_t> front;
  std::vector<bool> in_front(distinct.size(), false);
  for (size_t k : pareto_front(subset)) {
    front.push_back(distinct[k]);
    in_front[k] = true;
  }
  std::stable_sort(front.begin(), front.end(), by_score);

  if (front.size() < min_results) {
    std::vector<size_t> rest;
    for (size_t k = 0; k < distinct.size(); ++k)
      if (!in_front[k]) rest.push_back(distinct[k]);
    std::stable_sort(rest.begin(), rest.end(), by_score);
    for (size_t k = 0; k < rest.size() && front.size() < min_results; ++k) front.push_back(rest[k]);
  }
  if (front.size() > limit) front.resize(limit);

  // First minimum wins ties, like Python's min().
  auto first_min = [&](auto key) {
    size_t best = 0;
    for (size_t k = 1; k < front.size(); ++k)
      if (key(front[k]) < key(front[best])) best = k;
    return best;
  };
  std::vector<Ranked> out;
  for (size_t i : front) out.push_back({i, 0});
  if (out.empty()) return out;
  out[first_min([&](size_t i) { return duration_s(its[i]); })].labels |= FASTEST;
  out[first_min([&](size_t i) { return its[i].total_cost; })].labels |= CHEAPEST;
  out[first_min([&](size_t i) { return scores[i]; })].labels |= BEST_BALANCE;
  return out;
}

}  // namespace mmr
