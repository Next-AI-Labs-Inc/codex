export const resolveApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    return "";
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  return "http://localhost:3000";
};
