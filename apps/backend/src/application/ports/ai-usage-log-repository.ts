export interface AiUsageLogEntry {
  userId: string;
  layer: number;
  inputTokens: number;
  outputTokens: number;
}

export interface AiUsageByLayer {
  layer: number;
  callCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface AiUsageLogRepository {
  record(entry: AiUsageLogEntry): Promise<void>;
  aggregateByLayerSince(since: Date): Promise<AiUsageByLayer[]>;
}
