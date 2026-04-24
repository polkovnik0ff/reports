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

function ErrorBlock() {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-6 text-center text-sm text-gray-400 italic">
      Данные недоступны
    </div>
  );
}

function renderBlock(block: BlockConfig, blockData: { data?: unknown; error?: string } | null) {
  if (blockData?.error) return <ErrorBlock />;

  const data = blockData?.data;
  const type = block.type as BlockType;

  switch (type) {
    case "traffic_summary":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <TrafficSummaryBlock data={data as any} />;
    case "traffic_channels":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <TrafficChannelsBlock data={data as any} />;
    case "traffic_search_engines":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <TrafficSearchEnginesBlock data={data as any} />;
    case "traffic_search_dynamics":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <TrafficSearchDynamicsBlock data={data as any} />;
    case "traffic_yoy":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <TrafficYoYBlock data={data as any} />;
    case "traffic_geography":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <TrafficGeographyBlock data={data as any} />;
    case "traffic_devices":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <TrafficDevicesBlock data={data as any} />;
    case "top_pages":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <TopPagesBlock data={data as any} />;
    case "top_queries":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <TopQueriesBlock data={data as any} />;
    case "referrals":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <ReferralsBlock data={data as any} />;
    case "high_bounce_pages":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <HighBouncePagesBlock data={data as any} />;
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
