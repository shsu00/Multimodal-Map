import type { City, GeocodeResult, Itinerary, PlanRequest } from "./types";

export class PlannerClient {
  constructor(private baseUrl: string) {}

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async plan(req: PlanRequest): Promise<Itinerary[]> {
    const body = await this.json<{ itineraries: Itinerary[] }>("/v1/plan", {
      method: "POST",
      body: JSON.stringify(req),
    });
    return body.itineraries;
  }

  geocode(q: string, limit = 5): Promise<GeocodeResult[]> {
    return this.json(`/v1/geocode?q=${encodeURIComponent(q)}&limit=${limit}`);
  }

  reverse(lat: number, lon: number): Promise<GeocodeResult[]> {
    return this.json(`/v1/reverse?lat=${lat}&lon=${lon}`);
  }

  city(): Promise<City> {
    return this.json("/v1/city");
  }
}
