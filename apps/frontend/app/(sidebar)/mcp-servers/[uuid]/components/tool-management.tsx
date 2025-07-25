"use client";

import { RequestOptions } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  ClientRequest,
  ListToolsResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Tool } from "@repo/zod-types";
import { AlertTriangle, Database, RefreshCw, Wrench } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

import { UnifiedToolsTable } from "./tools-data-table";

// MCP Tool type from the protocol
interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

// Type for the tools/list response
interface ToolsListResponse {
  tools: MCPTool[];
}

interface ToolManagementProps {
  mcpServerUuid: string;
  makeRequest: <T extends z.ZodType>(
    request: ClientRequest,
    schema: T,
    options?: RequestOptions & { suppressToast?: boolean },
  ) => Promise<z.output<T>>;
}

export function ToolManagement({
  mcpServerUuid,
  makeRequest,
}: ToolManagementProps) {
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(false);
  const hasInitiallyFetched = useRef(false);

  // Get tRPC utils for cache invalidation
  const utils = trpc.useUtils();

  // Get tools from database
  const { data: dbToolsResponse, refetch: refetchDbTools } =
    trpc.frontend.tools.getByMcpServerUuid.useQuery({
      mcpServerUuid,
    });

  const dbTools: Tool[] = dbToolsResponse?.success ? dbToolsResponse.data : [];

  // Save tools to database mutation
  const saveToolsMutation = trpc.frontend.tools.create.useMutation({
    onSuccess: (response) => {
      if (response.success) {
        const foundCount = mcpTools.length;
        toast.success(`Found ${foundCount} tools from MCP server`);
        // Invalidate and refetch the tools list
        utils.frontend.tools.getByMcpServerUuid.invalidate({ mcpServerUuid });
        refetchDbTools();
      } else {
        toast.error(response.error || "Failed to save tools");
      }
    },
    onError: (error) => {
      console.error("Error saving tools:", error);
      toast.error("Failed to save tools", {
        description: error.message,
      });
    },
  });

  // Fetch tools from MCP server
  const fetchMCPTools = useCallback(async () => {
    setLoading(true);
    try {
      const response = (await makeRequest(
        {
          method: "tools/list" as const,
          params: {},
        },
        ListToolsResultSchema,
        { suppressToast: true },
      )) as ToolsListResponse;

      if (response?.tools) {
        setMcpTools(response.tools);

        // Automatically save tools to database
        if (response.tools.length > 0) {
          const toolsToSave = response.tools.map((tool) => ({
            name: tool.name,
            description: tool.description || undefined,
            inputSchema: tool.inputSchema || { type: "object" as const },
          }));

          saveToolsMutation.mutate({
            mcpServerUuid,
            tools: toolsToSave,
          });
        } else {
          toast.info("No tools found on MCP server");
        }
      } else {
        setMcpTools([]);
        toast.info("No tools found on MCP server");
      }
    } catch (error) {
      console.error("Error fetching MCP tools:", error);
      toast.error("Failed to fetch tools from MCP server", {
        description: error instanceof Error ? error.message : String(error),
      });
      setMcpTools([]);
    } finally {
      setLoading(false);
    }
  }, [makeRequest, mcpServerUuid, saveToolsMutation]);

  // Auto-fetch tools when component mounts - but only once
  useEffect(() => {
    if (!hasInitiallyFetched.current) {
      hasInitiallyFetched.current = true;
      fetchMCPTools();
    }
  }, [fetchMCPTools]);

  // Calculate tool counts for display
  const mcpToolCount = mcpTools.length;
  const dbToolCount = dbTools.length;
  const newToolsCount = mcpTools.filter(
    (mcpTool) => !dbTools.some((dbTool) => dbTool.name === mcpTool.name),
  ).length;

  return (
    <div className="space-y-4">
      {/* Header with counts and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Tools Overview:</span>
          <span className="text-sm text-muted-foreground">
            {mcpToolCount} from MCP
          </span>
          <span className="text-muted-foreground">•</span>
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {dbToolCount} saved
          </span>
          {newToolsCount > 0 && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-amber-600 font-medium">
                {newToolsCount} new
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMCPTools}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh Tools
          </Button>
        </div>
      </div>

      {/* Unified Tools Table */}
      <div className="rounded-lg border">
        <UnifiedToolsTable
          dbTools={dbTools}
          mcpTools={mcpTools}
          mcpServerUuid={mcpServerUuid}
          loading={loading}
          onRefreshMcpTools={fetchMCPTools}
        />
      </div>

      {/* Help text when no tools are available */}
      {!loading && mcpToolCount === 0 && dbToolCount === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <h4 className="text-sm font-medium">No Tools Available</h4>
          <p className="text-xs text-muted-foreground mt-1">
            This MCP server doesn&apos;t expose any tools, or there was an error
            fetching them. Try refreshing to check again.
          </p>
        </div>
      )}
    </div>
  );
}
