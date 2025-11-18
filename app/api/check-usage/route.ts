
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canUseTool, ToolName } from "@/lib/usage-limits";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { toolName, sessionId } = await request.json();
    
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const result = await canUseTool(
      toolName as ToolName,
      userId,
      sessionId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking usage:", error);
    return NextResponse.json(
      { error: "Error al verificar uso" },
      { status: 500 }
    );
  }
}
