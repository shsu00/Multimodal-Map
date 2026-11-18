# Multimodal Router: planning docs

Husky Coding Project 2026 (UW). A Greater Seattle trip planner: pick a start, a destination and up to 3 stopovers, choose walk, transit or bike, and compare up to 5 different routes, each with every leg, stop and transfer.

**This branch (`Draft-Planning`) holds the planning documents only.** The working prototype code (web app, API, C++ engine, OpenTripPlanner setup) is on the **`seattle-first-draft`** branch.

## Where to start

1. [docs/architecture.md](docs/architecture.md), section 15: the whole system in plain terms (5 minutes).
2. [docs/product-requirements.md](docs/product-requirements.md), sections 1–4: what the app does and for whom.
3. [docs/user-flows.md](docs/user-flows.md), sections 1–3, with the Figma prototype open: what users see.
4. [docs/api-endpoints.md](docs/api-endpoints.md): the main API endpoints.
5. [docs/roadmap.md](docs/roadmap.md), sections 0 and 2: what gets built when.

## All documents

| Document | What it covers |
|---|---|
| [docs/product-requirements.md](docs/product-requirements.md) | Goals, users, scope, every requirement, success targets |
| [docs/architecture.md](docs/architecture.md) | How the system fits together, data storage, hosting, accounts (Supabase) |
| [docs/api-contract.md](docs/api-contract.md) | The full API: rules, schemas, errors, examples |
| [docs/api-endpoints.md](docs/api-endpoints.md) | The main endpoints in a short, standard format |
| [contracts/openapi.yaml](contracts/openapi.yaml) | The machine-readable API description |
| [docs/routing-engine.md](docs/routing-engine.md) | The C++ engine: algorithms, tests, research route-finder |
| [docs/data-sources.md](docs/data-sources.md) | Transit and map data, licences, the data pipeline |
| [docs/user-flows.md](docs/user-flows.md) | Every screen and flow for the web and mobile apps |
| [docs/design-system.md](docs/design-system.md) | Colours, type, components, Figma links |
| [docs/roadmap.md](docs/roadmap.md) | Phases, sprints, tasks, testing and release plan |
| [docs/repository-analysis.md](docs/repository-analysis.md) | Snapshot of the prototype code as of 13 Nov 2026 |
| [CLAUDE.md](CLAUDE.md) | Working rules for AI-assisted work on the project |

**Design:** [Figma file](https://www.figma.com/design/yi28Igc7sW9WmHXMM7GYTT/HCP-Multimodal-Router), page "Main Wireframe Layout" (press Present for the clickable prototype).

## Status

Every plan here is **decided**. Most of it is **not built yet**; each doc marks what exists in the prototype today and what is planned.
