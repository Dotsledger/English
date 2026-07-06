import { notFound } from "next/navigation";
import { topicById, topics } from "@/lib/data/topics";
import { SessionLoader } from "@/components/SessionLoader";

export function generateStaticParams() {
  return topics.map((t) => ({ topicId: t.id }));
}

export default async function FeedPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const topic = topicById.get(topicId);
  if (!topic) notFound();

  return (
    <SessionLoader
      mode={{ kind: "category", seedTopicId: topic.id }}
      title={`${topic.category} · ${topic.title}`}
    />
  );
}
