#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getOrCreatePlayer, getCoins, adjustCoins, closeDb } from "../../server/db.js";

const server = new McpServer({
  name: "suy-world-db",
  version: "1.0.0",
});

server.registerTool(
  "get_or_create_player",
  {
    title: "Get or create player",
    description: "Fetches a player row by uuid, creating it (with 25 starting coins) if it doesn't exist yet.",
    inputSchema: {
      uuid: z.string().describe("Player's unique identifier"),
      name: z.string().describe("Display name to use if the player is newly created"),
    },
  },
  async ({ uuid, name }) => {
    const player = getOrCreatePlayer(uuid, name);
    return { content: [{ type: "text", text: JSON.stringify(player) }] };
  }
);

server.registerTool(
  "get_coins",
  {
    title: "Get coins",
    description: "Returns a player's current coin balance.",
    inputSchema: {
      uuid: z.string().describe("Player's unique identifier"),
    },
  },
  async ({ uuid }) => {
    const coins = getCoins(uuid);
    return { content: [{ type: "text", text: String(coins) }] };
  }
);

server.registerTool(
  "adjust_coins",
  {
    title: "Adjust coins",
    description: "Adds (or, with a negative delta, subtracts) coins from a player's balance. Throws if the balance would go negative. Returns the new balance.",
    inputSchema: {
      uuid: z.string().describe("Player's unique identifier"),
      delta: z.number().int().describe("Amount to add; use a negative number to deduct coins"),
    },
  },
  async ({ uuid, delta }) => {
    try {
      const coins = adjustCoins(uuid, delta);
      return { content: [{ type: "text", text: String(coins) }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "close_db",
  {
    title: "Close database",
    description: "Closes the SQLite database connection. Only use this when shutting the server down; any further tool calls after this will fail.",
    inputSchema: {},
  },
  async () => {
    closeDb();
    return { content: [{ type: "text", text: "Database connection closed." }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
