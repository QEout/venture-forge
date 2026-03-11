const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082";

export async function fetchAgents() {
  const res = await fetch(`${API_BASE}/api/agents`);
  return res.json();
}

export async function createIdea(data: {
  name: string;
  problem: string;
  solution: string;
  target_user: string;
  biz_model: string;
  agent_ids: string[];
}) {
  const res = await fetch(`${API_BASE}/api/idea`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchIdea(id: string) {
  const res = await fetch(`${API_BASE}/api/idea/${id}`);
  return res.json();
}

export async function fetchIdeas() {
  const res = await fetch(`${API_BASE}/api/ideas`);
  return res.json();
}

export async function fetchDiscussions(ideaId: string) {
  const res = await fetch(`${API_BASE}/api/idea/${ideaId}/discussions`);
  return res.json();
}

export function discussStreamUrl(ideaId: string) {
  return `${API_BASE}/api/idea/${ideaId}/discuss/stream`;
}

export async function generateReport(ideaId: string) {
  const res = await fetch(`${API_BASE}/api/idea/${ideaId}/report`, {
    method: "POST",
  });
  return res.json();
}

export async function fetchReport(ideaId: string) {
  const res = await fetch(`${API_BASE}/api/idea/${ideaId}/report`);
  if (res.status === 404) return null;
  return res.json();
}

export async function runMonteCarlo(ideaId: string) {
  const res = await fetch(`${API_BASE}/api/idea/${ideaId}/simulate/monte_carlo`, { method: "POST" });
  if (!res.ok) throw new Error("Simulation failed");
  return res.json();
}

export async function fetchMonteCarlo(ideaId: string) {
  const res = await fetch(`${API_BASE}/api/idea/${ideaId}/simulate/monte_carlo`);
  if (!res.ok) return null;
  return res.json();
}

export async function startOasisSimulation(ideaId: string) {
  const res = await fetch(`${API_BASE}/api/idea/${ideaId}/simulate/oasis`, { method: "POST" });
  if (!res.ok) throw new Error("Simulation failed");
  return res.json();
}

export async function fetchOasis(ideaId: string) {
  const res = await fetch(`${API_BASE}/api/idea/${ideaId}/simulate/oasis`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchOasisRunStatus(ideaId: string) {
  const res = await fetch(`${API_BASE}/api/idea/${ideaId}/simulate/oasis/run-status`);
  if (!res.ok) throw new Error("Failed to fetch simulation status");
  return res.json();
}

export async function fetchOasisRunDetail(ideaId: string) {
  const res = await fetch(`${API_BASE}/api/idea/${ideaId}/simulate/oasis/run-status/detail`);
  if (!res.ok) throw new Error("Failed to fetch simulation detail");
  return res.json();
}

export async function generatePitchDeck(ideaId: string) {
  const res = await fetch(`${API_BASE}/api/idea/${ideaId}/generate/pitch_deck`, { method: "POST" });
  if (!res.ok) throw new Error("Generation failed");
  return res.json();
}

export async function fetchPitchDeck(ideaId: string) {
  const res = await fetch(`${API_BASE}/api/idea/${ideaId}/generate/pitch_deck`);
  if (!res.ok) return null;
  return res.json();
}
