const CIQ_STORAGE_KEYS = {
  HISTORY: "ciqHistory",
  CLUSTERS: "ciqClusters",
  SUGGESTIONS: "ciqSuggestions",
  TEMPLATES: "ciqTemplates",
  SETTINGS: "ciqSettings"
};

const CIQ_DEFAULT_SETTINGS = {
  captureEnabled: true,
  similarityThreshold: 0.6,
  minClusterSize: 3,
  maxHistory: 200
};

const CIQ_MIN_CAPTURE_LENGTH = 8;
const CIQ_MAX_CAPTURE_LENGTH = 4000;
const CIQ_DEDUP_WINDOW_MS = 3000;
const CIQ_UNCLUSTERED_LOOKBACK = 40;
const CIQ_CLUSTER_GROWTH_FOR_RESURFACE = 3;

function ciqId(prefix) {
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function ciqTruncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

function ciqRelativeTime(timestamp) {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return diffSec + "s ago";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return diffMin + "m ago";
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return diffHour + "h ago";
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return diffDay + "d ago";
  return new Date(timestamp).toLocaleDateString();
}

function ciqHumanizePlaceholder(type) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
