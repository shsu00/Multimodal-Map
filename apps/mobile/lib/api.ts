import { PlannerClient } from "@mmr/shared";

export const api = new PlannerClient(process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000");
