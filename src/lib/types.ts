export interface Agent {
  id: string;
  name_en: string;
  name_cn: string;
  tribute_to: string;
  identity: string;
  identity_cn: string;
  personality: string;
  perspective: string;
  avatar_desc: string;
  color: string;
  tags: string[];
}

export interface RecommendedCombo {
  name_en: string;
  name_cn: string;
  agent_ids: string[];
  description_en: string;
  description_cn: string;
}

export interface Idea {
  id: string;
  ts: string;
  name: string;
  problem: string;
  solution: string;
  target_user: string;
  biz_model: string;
  extra: string;
  agent_ids: string;
  status: string;
}

export interface DiscussionMessage {
  round: number;
  agent_id: string;
  agent_name: string;
  content: string;
  stance?: string;
  score?: number;
  sources?: { title: string; url: string }[];
}

export interface SSEEvent {
  event: string;
  data: Record<string, unknown>;
}

export interface Report {
  summary: string;
  viewpoints: { agent: string; position: string; key_quote: string }[];
  disputes: { topic: string; sides: { agent: string; position: string }[] }[];
  risks: { risk: string; raised_by: string; severity: string }[];
  excitement: { point: string; raised_by: string }[];
  stance_summary: Record<string, number>;
}
