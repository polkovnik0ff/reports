"use client";

import { BlockConfig, BlockType, BLOCK_LABELS } from "@/lib/blocks/defaults";
import { BlockWrapper } from "./block-wrapper";
import { TrafficSummaryBlock } from "./blocks/traffic-summary";
import { TrafficChannelsBlock } from "./blocks/traffic-channels";
import { TrafficSearchEnginesBlock } from "./blocks/traffic-search-engines";
import { TrafficSearchDynamicsBlock } from "./blocks/traffic-search-dynamics";
import { TrafficYoYBlock } from "./blocks/traffic-yoy";
import { TrafficGeographyBlock } from "./blocks/traffic-geography";
import { TrafficDevicesBlock } from "./blocks/traffic-devices";
import { TopPagesBlock } from "./blocks/top-pages";
import { TopQueriesBlock } from "./blocks/top-queries";
import { ReferralsBlock } from "./blocks/referrals";
import { HighBouncePagesBlock } from "./blocks/high-bounce-pages";
import { RichTextBlock } from "./blocks/rich-text-block";

interface ReportRendererProps {
  reportConfig: BlockConfig[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshotData: Record<string, any>;
}

function ErrorBlock({ message }: { message?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-6 text-center text-sm text-gray-400 italic">
      {message ? `Ошибка: ${message}` : "Данные недоступны"}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderBlock(block: BlockConfig, blockData: { data?: any; error?: string } | null) {
  if (blockData?.error) return <ErrorBlock message={blockData.error} />;
  if (blockData?.data == null && !["work_done", "work_plan", "custom_text", "custom_kpi"].includes(block.type)) {
    return <ErrorBlock />;
  }

  const data = blockData?.data;
  const type = block.type as BlockType;

  switch (type) {
    case "traffic_summary":
      return <TrafficSummaryBlock data={data} />;
    case "traffic_channels":
      return <TrafficChannelsBlock data={data} />;
    case "traffic_search_engines":
      return <TrafficSearchEnginesBlock data={data} />;
    case "traffic_search_dynamics":
      return <TrafficSearchDynamicsBlock data={data} />;
    case "traffic_yoy":
      return <TrafficYoYBlock data={data} />;
    case "traffic_geography":
      return <TrafficGeographyBlock data={data} />;
    case "traffic_devices":
      return <TrafficDevicesBlock data={data} />;
    case "top_pages":
      return <TopPagesBlock data={data} />;
    case "top_queries":
      return <TopQueriesBlock data={data} />;
    case "referrals":
      return <ReferralsBlock data={data} />;
    case "high_bounce_pages":
      return <HighBouncePagesBlock data={data} />;
    case "work_done":
    case "work_plan":
    case "custom_text":
      return <RichTextBlock content={block.settings?.content as string ?? ""} />;
    case "custom_kpi":
    case "positions_summary":
    case "positions_table":
      return (
        <div className="rounded-lg bg-gray-50 border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-400 italic">
          Блок будет доступен в следующей версии
        </div>
      );
    default:
      return <ErrorBlock />;
  }
}

export function ReportRenderer({ reportConfig, snapshotData }: ReportRendererProps) {
  const sorted = [...reportConfig]
    .filter((b) => b.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div>
      {sorted.map((block) => {
        const blockData = snapshotData?.[block.id] ?? null;
        return (
          <BlockWrapper
            key={block.id}
            title={BLOCK_LABELS[block.type as BlockType] ?? block.type}
            commentAbove={block.commentAbove}
            commentBelow={block.commentBelow}
          >
            {renderBlock(block, blockData)}
          </BlockWrapper>
        );
      })}
    </div>
  );
}
