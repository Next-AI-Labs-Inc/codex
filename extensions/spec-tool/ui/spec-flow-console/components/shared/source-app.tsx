import Image from "next/image";
import { SOURCE_APP_LABELS } from "@/lib/source-app-map";

export const Icon = ({ source }: { source: string }) => {
  return (
    <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden -mr-1">
      <Image src={source} alt={source} width={40} height={40} />
    </div>
  );
};

export const constants = {
  claude: {
    name: "Claude",
    icon: <Icon source="/images/claude.webp" />,
    iconImage: "/images/claude.webp",
  },
  openmemory: {
    name: "Next AI Labs",
    icon: <Icon source="/images/default.png" />,
    iconImage: "/images/default.png",
  },
  cursor: {
    name: "Cursor",
    icon: <Icon source="/images/cursor.png" />,
    iconImage: "/images/cursor.png",
  },
  cline: {
    name: "Cline",
    icon: <Icon source="/images/cline.png" />,
    iconImage: "/images/cline.png",
  },
  roocline: {
    name: "Roo Cline",
    icon: <Icon source="/images/roocline.png" />,
    iconImage: "/images/roocline.png",
  },
  windsurf: {
    name: "Windsurf",
    icon: <Icon source="/images/windsurf.png" />,
    iconImage: "/images/windsurf.png",
  },
  witsy: {
    name: "Witsy",
    icon: <Icon source="/images/witsy.png" />,
    iconImage: "/images/witsy.png",
  },
  enconvo: {
    name: "Enconvo",
    icon: <Icon source="/images/enconvo.png" />,
    iconImage: "/images/enconvo.png",
  },
  augment: {
    name: "Augment",
    icon: <Icon source="/images/augment.png" />,
    iconImage: "/images/augment.png",
  },
  default: {
    name: "Default",
    icon: null,
    iconImage: null,
  },
};

const SourceApp = ({ source }: { source: string }) => {
  const displayName = SOURCE_APP_LABELS[source] ?? source;
  const entry = constants[source as keyof typeof constants];

  if (!entry) {
    return <span className="text-sm font-semibold">{displayName}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {entry.icon ?? null}
      <span className="text-sm font-semibold">
        {SOURCE_APP_LABELS[source] ?? entry.name}
      </span>
    </div>
  );
};

export default SourceApp;
