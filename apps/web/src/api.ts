import { PlannerClient } from "@mmr/shared";

export const api = new PlannerClient(import.meta.env.VITE_API_URL ?? "http://localhost:8000");
