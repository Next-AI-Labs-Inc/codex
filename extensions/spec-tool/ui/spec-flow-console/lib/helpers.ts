const capitalize = (str: string) => {
    if (!str) return ''
    if (str.length <= 1) return str.toUpperCase()
    return str.toUpperCase()[0] + str.slice(1)
}

function formatDate(timestamp?: number | string | null) {
  if (timestamp == null) return "—";
  const value =
    typeof timestamp === "string" ? Date.parse(timestamp) : Number(timestamp);

  if (!Number.isFinite(value)) return "—";

  const date = new Date(value);

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export { capitalize, formatDate }
