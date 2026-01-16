import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { useStats } from "@/hooks/useStats";

const Stats = () => {
  const totalMemories = useSelector(
    (state: RootState) => state.profile.totalMemories
  );
  const { fetchStats } = useStats();

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800">
      <div className="bg-zinc-800 border-b border-zinc-800 rounded-t-lg p-4">
        <div className="text-white text-xl font-semibold">
          Agent Hive Connection Points
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-zinc-400">Total Memories</p>
          <h3 className="text-lg font-bold text-white">
            {totalMemories} Memories
          </h3>
        </div>
      </div>
    </div>
  );
};

export default Stats;
