export type OptimizeRequest = {
  rawQuestion: string;
  context: string;
  targetAi: string;
  language: string;
  askFollowupsFirst: boolean;
};

export type OptimizeResponse = {
  optimizedPrompt: string;
  briefRationale: string;
  followupQuestions: string[];
  autonomyNote: string;
};

export type HistoryItem = {
  id: string;
  createdAt: string;
  request: OptimizeRequest;
  result: OptimizeResponse;
};
