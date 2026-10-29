// Pick the itineraries worth showing: best on time vs money, then rank and label
// (planner/pareto.py).
#pragma once

#include <cstddef>
#include <cstdint>

#include "mmr/types.hpp"

namespace mmr {

enum Label : uint8_t { FASTEST = 1, CHEAPEST = 2, BEST_BALANCE = 4 };

struct Ranked {
  size_t index;    // position in the input vector
  uint8_t labels;  // Label bits
};

// a is at least as good as b on time and cost, and strictly better on one.
bool dominates(const Itinerary& a, const Itinerary& b);

// Indices of the itineraries no other one dominates, in input order.
// Sort-and-sweep, O(n log n).
std::vector<size_t> pareto_front(const std::vector<Itinerary>& its);

// Generalised cost in money: lower is better.
double score(const Itinerary& it, const Prefs& prefs);

// Pareto-optimal options with distinct mode sequences, best score first, topped
// up with the next-best alternatives when the front is smaller than min_results.
std::vector<Ranked> rank(const std::vector<Itinerary>& its, const Prefs& prefs, size_t limit = 5,
                         size_t min_results = 3);

}  // namespace mmr
