import { notFound } from "next/navigation";
import { topicById, topics } from "@/lib/data/topics";
import { buildFeed } from "@/lib/data/scenes";
import { Feed } from "@/components/Feed";

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

  const scenes = buildFeed(topicId);
  return <Feed topic={topic} scenes={scenes} />;
}
