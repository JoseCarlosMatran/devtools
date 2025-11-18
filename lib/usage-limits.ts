
import { prisma } from "./db";

const TOOLS = [
  "json-formatter",
  "api-tester",
  "regex-tester",
  "jwt-decoder",
  "base64",
  "hash-generator",
  "diff-checker",
  "color-picker",
  "sql-formatter",
  "markdown-editor",
  "qr-generator",
  "url-encoder",
  "timestamp-converter",
  "uuid-generator",
  "cron-generator",
] as const;

export type ToolName = typeof TOOLS[number];

export async function canUseTool(
  toolName: ToolName,
  userId?: string,
  sessionId?: string
): Promise<{ canUse: boolean; isSubscribed: boolean; usageCount: number }> {
  // If user is logged in, check subscription
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    const isSubscribed = user?.subscription?.status === "active";

    if (isSubscribed) {
      return { canUse: true, isSubscribed: true, usageCount: 0 };
    }
  }

  // For demo users (not subscribed), check if they've used this tool before
  const identifier = userId || sessionId || "";
  
  if (!identifier) {
    return { canUse: true, isSubscribed: false, usageCount: 0 };
  }

  const usageCount = await prisma.toolUsage.count({
    where: {
      toolName,
      ...(userId ? { userId } : { sessionId: identifier }),
    },
  });

  return {
    canUse: usageCount === 0, // Demo users can only use each tool once
    isSubscribed: false,
    usageCount,
  };
}

export async function recordToolUsage(
  toolName: ToolName,
  userId?: string,
  sessionId?: string
): Promise<void> {
  const identifier = userId || sessionId || "";
  
  if (!identifier) return;

  await prisma.toolUsage.create({
    data: {
      toolName,
      userId: userId || null,
      sessionId: identifier,
    },
  });
}
