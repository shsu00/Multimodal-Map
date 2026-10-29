cmake_minimum_required(VERSION 3.20)
project(mmr_core LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

# pip builds (scikit-build-core sets SKBUILD) want the Python module only;
# `npm run core:test` builds the library and the Catch2 tests only.
if(DEFINED SKBUILD)
  set(MMR_BUILD_PYTHON ON)
  set(MMR_BUILD_TESTS OFF)
else()
  option(MMR_BUILD_PYTHON "Build the mmr_core Python module" OFF)
  option(MMR_BUILD_TESTS "Build the C++ unit tests" ON)
endif()

add_library(mmr STATIC
  src/itinerary.cpp
  src/fares.cpp
  src/cost_model.cpp
  src/pareto.cpp
  src/filters.cpp
  src/polyline.cpp
)
target_include_directories(mmr PUBLIC include)
# No fused multiply-add: prices must round step by step like Python's floats.
target_compile_options(mmr PRIVATE -Wall -Wextra -Wpedantic -ffp-contract=off)

if(MMR_BUILD_PYTHON)
  find_package(Python 3.12 REQUIRED COMPONENTS Interpreter Development.Module ${SKBUILD_SABI_COMPONENT})
  find_package(nanobind CONFIG REQUIRED)
  # One abi3 build works on every Python >= 3.12.
  nanobind_add_module(mmr_core STABLE_ABI NB_STATIC src/bindings.cpp)
  target_link_libraries(mmr_core PRIVATE mmr)
  install(TARGETS mmr_core LIBRARY DESTINATION .)
endif()

if(MMR_BUILD_TESTS)
  include(FetchContent)
  FetchContent_Declare(
    Catch2
    GIT_REPOSITORY https://github.com/catchorg/Catch2.git
    GIT_TAG v3.8.1
    GIT_SHALLOW TRUE
  )
  FetchContent_MakeAvailable(Catch2)

  add_executable(mmr_tests
    tests/test_itinerary.cpp
    tests/test_fares.cpp
    tests/test_cost_model.cpp
    tests/test_pareto.cpp
    tests/test_polyline.cpp
  )
  target_link_libraries(mmr_tests PRIVATE mmr Catch2::Catch2WithMain)
  enable_testing()
  include(Catch)
  catch_discover_tests(mmr_tests)
endif()
