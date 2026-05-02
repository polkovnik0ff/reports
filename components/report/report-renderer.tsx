"use client";

import { BlockConfig, BlockType, BLOCK_LABELS } from "@/lib/blocks/defaults";
import { BlockWrapper } from "./block-wrapper";
import { TrafficSummaryBlock } from "./blocks/traffic-summary";
import { TrafficChannelsBlock } from "./blocks/traffic-channels";
import { TrafficSearchEnginesBlock } from "./blocks/traffic-search-engines";
import { SearchEnginesDynamicsBlock } from "./blocks/search-engines-dynamics";
import { TrafficSearchDynamicsBlock } from "./blocks/traffic-search-dynamics";
import { TrafficYoYBlock } from "./blocks/traffic-yoy";
import { TrafficGeographyBlock } from "./blocks/traffic-geography";
import { TrafficDevicesBlock } from "./blocks/traffic-devices";
import { TopPagesBlock } from "./blocks/top-pages";
import { TopQueriesBlock } from "./blocks/top-queries";
import { ReferralsBlock } from "./blocks/referrals";
import { HighBouncePagesBlock } from "./blocks/high-bounce-pages";
import { RichTextBlock } from "./blocks/rich-text-block";
import { PositionsSummaryBlock } from "./blocks/positions-summary";
import { PositionsTableBlock } from "./blocks/positions-table";
import { WebmasterIkhBlock } from "./blocks/webmaster-ikh";
import { WebmasterIndexingBlock } from "./blocks/webmaster-indexing";
import { WebmasterBacklinksBlock } from "./blocks/webmaster-backlinks";
import { WebmasterSearchSummaryBlock } from "./blocks/webmaster-search-summary";
import { GscSummaryBlock } from "./blocks/gsc-summary";
import { TestBlock } from "./blocks/test-block";

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
function renderBlock(block: BlockConfig, blockData: { data?: any; error?: string } | null, snapshotData: Record<string, any>) {
  if (blockData?.error) return <ErrorBlock message={blockData.error} />;
  if (blockData?.data == null && !["work_done", "work_plan", "custom_text", "custom_kpi", "search_engines_dynamics", "webmaster_ikh", "webmaster_indexing", "webmaster_backlinks", "webmaster_search_summary", "gsc_summary"].includes(block.type)) {
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
    case "search_engines_dynamics":
      return (
        <SearchEnginesDynamicsBlock
          dynamicsData={data ?? null}
          tableData={snapshotData?.["traffic_search_engines"]?.data ?? null}
        />
      );
    case "traffic_search_dynamics":
      return (
        <TrafficSearchDynamicsBlock
          data={data}
          tableData={snapshotData?.["traffic_search_engines"]?.data ?? null}
        />
      );
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
      return (
        <div className="rounded-lg bg-gray-50 border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-400 italic">
          Блок будет доступен в следующей версии
        </div>
      );
    case "positions_summary":
      return <PositionsSummaryBlock data={data} />;
    case "positions_table":
      return <PositionsTableBlock data={data} />;
    case "webmaster_ikh":
      return data ? <WebmasterIkhBlock data={data} /> : <ErrorBlock message="Нет данных ИКС" />;
    case "webmaster_indexing":
      return data ? <WebmasterIndexingBlock data={data} /> : <ErrorBlock message="Нет данных индексации" />;
    case "webmaster_backlinks":
      return data ? <WebmasterBacklinksBlock data={data} /> : <ErrorBlock message="Нет данных о ссылках" />;
    case "webmaster_search_summary":
      return data ? <WebmasterSearchSummaryBlock data={data} /> : <ErrorBlock message="Нет данных поисковых запросов" />;
    case "gsc_summary":
      return data ? <GscSummaryBlock data={data} /> : <ErrorBlock message="Нет данных GSC" />;
    case "test_block":
      return data ? <TestBlock data={data} /> : <ErrorBlock />;
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
      {sorted.map((block, idx) => {
        const blockData = snapshotData?.[block.id] ?? null;
        return (
          <BlockWrapper
            key={block.id}
            id={`block-${block.id}`}
            title={block.label || (BLOCK_LABELS[block.type as BlockType] ?? block.type)}
            sectionNum={idx + 1}
            commentAbove={block.commentAbove}
            commentBelow={block.commentBelow}
          >
            {renderBlock(block, blockData, snapshotData)}
          </BlockWrapper>
        );
      })}
    </div>
  );
}
