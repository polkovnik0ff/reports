import SourcesClient from "@/components/sources/sources-client";

interface Props {
  searchParams: Promise<{ success?: string; error?: string }>;
}

export default async function SourcesPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <SourcesClient
      success={params.success === "true"}
      error={params.error}
    />
  );
}
