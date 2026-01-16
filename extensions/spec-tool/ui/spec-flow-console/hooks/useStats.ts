import { useState } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { setApps, setTotalApps, setTotalMemories } from "@/store/profileSlice";
import { resolveApiBaseUrl } from "../lib/api-base";

// Define the new simplified memory type
export interface SimpleMemory {
  id: string;
  text: string;
  created_at: string;
  state: string;
  categories: string[];
  app_name: string;
}

// Define the shape of the API response item
interface APIStatsResponse {
  total_memories: number;
  total_apps: number;
  apps: any[];
}


interface UseMemoriesApiReturn {
  fetchStats: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const useStats = (): UseMemoriesApiReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const user_id = useSelector((state: RootState) => state.profile.userId);

  const getBaseUrl = resolveApiBaseUrl;

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = getBaseUrl();
      const response = await axios.get<APIStatsResponse>(
        `${baseUrl}/api/v1/stats?user_id=${user_id}`
      );
      dispatch(setTotalMemories(response.data.total_memories));
      dispatch(setTotalApps(response.data.total_apps));
      dispatch(setApps(response.data.apps));
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch stats';
      setError(errorMessage);
      setIsLoading(false);
      throw new Error(errorMessage);
    }
  };

  return { fetchStats, isLoading, error };
};
