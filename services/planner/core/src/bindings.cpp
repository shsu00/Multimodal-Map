// Python module `mmr_core`. planner/_native.py is the only caller.
#include <nanobind/nanobind.h>
#include <nanobind/stl/pair.h>
#include <nanobind/stl/string.h>
#include <nanobind/stl/string_view.h>
#include <nanobind/stl/vector.h>

#include "mmr/cost_model.hpp"
#include "mmr/fares.hpp"
#include "mmr/filters.hpp"
#include "mmr/itinerary.hpp"
#include "mmr/pareto.hpp"
#include "mmr/polyline.hpp"

namespace nb = nanobind;
using namespace nb::literals;
using namespace mmr;

NB_MODULE(mmr_core, m) {
  m.doc() = "C++ core of the multimodal router planner";

  nb::enum_<Mode>(m, "Mode")
      .value("WALK", Mode::WALK)
      .value("BIKE", Mode::BIKE)
      .value("SCOOTER", Mode::SCOOTER)
      .value("CAR", Mode::CAR)
      .value("TAXI", Mode::TAXI)
      .value("TRANSIT", Mode::TRANSIT);

  m.attr("FASTEST") = static_cast<int>(FASTEST);
  m.attr("CHEAPEST") = static_cast<int>(CHEAPEST);
  m.attr("BEST_BALANCE") = static_cast<int>(BEST_BALANCE);

  nb::class_<Leg>(m, "Leg")
      .def(
          "__init__",
          [](Leg* self, Mode mode, double start_s, double end_s, double distance_m, bool rented, bool parked_after) {
            new (self) Leg{mode, start_s, end_s, distance_m, rented, parked_after, 0.0};
          },
          "mode"_a, "start_s"_a, "end_s"_a, "distance_m"_a, "rented"_a = false, "parked_after"_a = false)
      .def_rw("mode", &Leg::mode)
      .def_rw("start_s", &Leg::start_s)
      .def_rw("end_s", &Leg::end_s)
      .def_rw("distance_m", &Leg::distance_m)
      .def_rw("rented", &Leg::rented)
      .def_rw("parked_after", &Leg::parked_after)
      .def_rw("cost", &Leg::cost)
      .def_prop_ro("duration_s", &Leg::duration_s);

  nb::class_<Itinerary>(m, "Itinerary")
      .def(
          "__init__",
          [](Itinerary* self, std::vector<Leg> legs, double total_cost) {
            new (self) Itinerary{std::move(legs), total_cost, false};
          },
          "legs"_a, "total_cost"_a = 0.0)
      .def_rw("legs", &Itinerary::legs)
      .def_rw("total_cost", &Itinerary::total_cost)
      .def_rw("estimated_cost", &Itinerary::estimated_cost)
      .def_prop_ro("duration_s", [](const Itinerary& it) { return duration_s(it); })
      .def_prop_ro("transfers", [](const Itinerary& it) { return transfers(it); })
      .def_prop_ro("walk_m", [](const Itinerary& it) { return walk_m(it); })
      .def_prop_ro("co2_g", [](const Itinerary& it) { return co2_g(it); })
      .def_prop_ro("mode_sequence", [](const Itinerary& it) { return mode_sequence(it); });

  nb::class_<Prefs>(m, "Prefs")
      .def(nb::init<>())
      .def_rw("value_of_time_per_hour", &Prefs::value_of_time_per_hour)
      .def_rw("transfer_penalty", &Prefs::transfer_penalty)
      .def_rw("max_walk_m", &Prefs::max_walk_m)
      .def_rw("max_transfers", &Prefs::max_transfers);

  nb::class_<TaxiPricing>(m, "TaxiPricing")
      .def(nb::init<>())
      .def_rw("base", &TaxiPricing::base)
      .def_rw("per_km", &TaxiPricing::per_km)
      .def_rw("per_min", &TaxiPricing::per_min)
      .def_rw("min_fare", &TaxiPricing::min_fare);

  nb::class_<RentalPricing>(m, "RentalPricing")
      .def(nb::init<>())
      .def_rw("unlock", &RentalPricing::unlock)
      .def_rw("per_min", &RentalPricing::per_min);

  nb::class_<TransitFare>(m, "TransitFare")
      .def(nb::init<>())
      .def_rw("flat", &TransitFare::flat)
      .def_rw("transfer_window_min", &TransitFare::transfer_window_min);

  nb::class_<CityPrices>(m, "CityPrices")
      .def(nb::init<>())
      .def_rw("fuel_price_per_l", &CityPrices::fuel_price_per_l)
      .def_rw("car_l_per_100km", &CityPrices::car_l_per_100km)
      .def_rw("parking_per_hour", &CityPrices::parking_per_hour)
      .def_rw("pnr_parking_flat", &CityPrices::pnr_parking_flat)
      .def_rw("taxi", &CityPrices::taxi)
      .def_rw("bike_rental", &CityPrices::bike_rental)
      .def_rw("scooter_rental", &CityPrices::scooter_rental)
      .def_rw("transit_fare", &CityPrices::transit_fare);

  m.def("transit_fares", &transit_fares, "legs"_a, "fare"_a);

  m.def(
      "price_itinerary",
      [](Itinerary it, const CityPrices& city, double stay_hours) {
        price_itinerary(it, city, stay_hours);
        return it;
      },
      "it"_a, "city"_a, "stay_hours"_a, "Return a priced copy of the itinerary.");

  m.def("score", &score, "it"_a, "prefs"_a);
  m.def("dominates", &dominates, "a"_a, "b"_a);
  m.def("pareto_front", &pareto_front, "its"_a);

  m.def(
      "rank",
      [](const std::vector<Itinerary>& its, const Prefs& prefs, size_t limit, size_t min_results) {
        std::vector<std::pair<size_t, int>> out;
        for (const auto& r : rank(its, prefs, limit, min_results)) out.emplace_back(r.index, r.labels);
        return out;
      },
      "its"_a, "prefs"_a, "limit"_a = 5, "min_results"_a = 3,
      "Return (input index, label bits) for each chosen itinerary, best first.");

  m.def("satisfies", &satisfies, "it"_a, "prefs"_a);
  m.def("uses_allowed_modes", &uses_allowed_modes, "it"_a, "allowed"_a);

  m.def("encode_polyline", &encode_polyline, "points"_a);
  m.def("decode_polyline", &decode_polyline, "encoded"_a);
}
