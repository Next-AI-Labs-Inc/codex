"use client";
import { useMemoriesApi } from "@/hooks/useMemoriesApi";
import { MemoryActions } from "./MemoryActions";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AccessLog } from "./AccessLog";
import Image from "next/image";
import Categories from "@/components/shared/categories";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { constants } from "@/components/shared/source-app";
import { RelatedMemories } from "./RelatedMemories";

interface MemoryDetailsProps {
  memory_id: string;
}

export function MemoryDetails({ memory_id }: MemoryDetailsProps) {
  const router = useRouter();
  const { fetchMemoryById, hasUpdates } = useMemoriesApi();
  const memory = useSelector(
    (state: RootState) => state.memories.selectedMemory
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (memory?.id) {
      await navigator.clipboard.writeText(memory.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    fetchMemoryById(memory_id);
  }, []);

  return (
    <div className="container mx-auto py-6 px-4">
      <Button
        variant="ghost"
        className="mb-4 text-zinc-400 hover:text-white"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Memories
      </Button>
      <div className="flex gap-4 w-full">
        <div className="rounded-lg w-2/3 border h-fit pb-2 border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="">
            <div className="flex px-6 py-3 justify-between items-center mb-6 bg-zinc-800 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-white">
                  Memory{" "}
                  <span className="ml-1 text-zinc-400 text-sm font-normal">
                    #{memory?.id?.slice(0, 6)}
                  </span>
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 text-zinc-400 hover:text-white -ml-[5px] mt-1"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <MemoryActions
                memoryId={memory?.id || ""}
                memoryContent={memory?.text || ""}
                memoryState={memory?.state || ""}
              />
            </div>

            <div className="px-6 py-2">
              {memory?.context && (
                <div className="mb-6">
                  <h2 className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-2">
                    Context
                  </h2>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {memory.context}
                  </p>
                </div>
              )}

              <div className="border-l-2 border-primary pl-4 mb-6">
                <p
                  className={`${
                    memory?.state === "archived" || memory?.state === "paused"
                      ? "text-zinc-400"
                      : "text-white"
                  }`}
                >
                  {memory?.text}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800">
                <div className="flex flex-wrap items-center gap-3">
                  <Categories
                    categories={memory?.categories || []}
                    isPaused={
                      memory?.state === "archived" ||
                      memory?.state === "paused"
                    }
                  />
                  {memory?.event_type && (
                    <div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/60 px-3 py-1 rounded-lg">
                      <span className="text-xs uppercase tracking-wide text-zinc-500">
                        {memory.event_type}
                      </span>
                    </div>
                  )}
                  {typeof memory?.confidence === "number" && (
                    <div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/60 px-3 py-1 rounded-lg">
                      <span className="text-xs uppercase tracking-wide text-zinc-500">
                        Confidence
                      </span>
                      <span className="text-sm font-semibold text-zinc-200">
                        {memory.confidence}/10
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 bg-zinc-700 px-3 py-1 rounded-lg ml-auto">
                    <span className="text-sm text-zinc-400">Created by:</span>
                    {constants[memory?.app_name as keyof typeof constants]?.iconImage ? (
                      <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                        <Image
                          src={
                            constants[memory?.app_name as keyof typeof constants]
                              ?.iconImage as string
                          }
                          alt="Source App"
                          width={24}
                          height={24}
                        />
                      </div>
                    ) : null}
                    <p className="text-sm text-zinc-100 font-semibold">
                      {
                        constants[memory?.app_name as keyof typeof constants]
                          ?.name
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-1/3 flex flex-col gap-4">
          <AccessLog memoryId={memory?.id || ""} />
          <RelatedMemories memoryId={memory?.id || ""} />
        </div>
      </div>
    </div>
  );
}
