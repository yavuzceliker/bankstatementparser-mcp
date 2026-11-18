#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const DEFAULT_API_URL = "https://api.bankstatementparser.net";

function getConfig() {
  const apiKey = process.env.BANK_STATEMENT_PARSER_API_KEY || process.env.BSP_API_KEY || "";
  const apiUrl = (process.env.BANK_STATEMENT_PARSER_API_URL || DEFAULT_API_URL).replace(/\/+$/, "");
  return { apiKey, apiUrl };
}

const server = new McpServer({
  name: "bank-statement-parser",
  version: "0.1.0",
});

server.tool(
  "parse_bank_statement",
  "Extract structured, balance-verified transactions from a local bank statement PDF (digital, scanned/OCR, or password-protected). Supports JSON, CSV, Xero CSV, QuickBooks QBO/IIF, OFX, and Tally XML outputs.",
  {
    file_path: z.string().describe("Absolute path to the PDF bank statement file."),
    password: z.string().optional().describe("Optional PDF open password if the statement is encrypted."),
    format: z
      .enum(["json", "csv", "xero_csv", "qbo", "ofx", "iif", "tally_xml"])
      .optional()
      .default("json")
      .describe("Desired output format (default: json)."),
    zero_retention: z
      .boolean()
      .optional()
      .default(true)
      .describe("When true (default), processes in volatile memory without storing the PDF on disk."),
  },
  async ({ file_path, password, format, zero_retention }) => {
    const { apiKey, apiUrl } = getConfig();
    if (!apiKey) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "Missing BANK_STATEMENT_PARSER_API_KEY environment variable. Get an API key at https://bankstatementparser.net/en/register",
          },
        ],
      };
    }

    const absPath = path.resolve(file_path);
    const bytes = await fs.readFile(absPath);
    const fileName = path.basename(absPath);

    const form = new FormData();
    form.append("file", new Blob([bytes], { type: "application/pdf" }), fileName);
    if (format && format !== "json") form.append("format", format);
    if (password) form.append("password", password);
    if (zero_retention) form.append("zeroRetention", "true");

    const res = await fetch(`${apiUrl}/extract`, {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: form,
    });

    const contentType = res.headers.get("content-type") || "";
    const requestId = res.headers.get("x-request-id");
    const bankKey = res.headers.get("x-bank-key");
    const bodyText = await res.text();

    if (!res.ok) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `API Error ${res.status}: ${bodyText}`,
          },
        ],
      };
    }

    if (format !== "json" && !contentType.includes("application/json")) {
      return {
        content: [
          {
            type: "text",
            text: `Format: ${format}\nRequestId: ${requestId ?? "n/a"}\nBankKey: ${bankKey ?? "n/a"}\n\n${bodyText}`,
          },
        ],
      };
    }

    return {
      content: [{ type: "text", text: bodyText }],
    };
  }
);

server.tool(
  "check_extraction_status",
  "Check the status and result of an asynchronous (HTTP 202) bank statement extraction job by queue ID.",
  {
    queue_id: z.string().describe("Queue item UUID returned by parse_bank_statement on HTTP 202."),
  },
  async ({ queue_id }) => {
    const { apiKey, apiUrl } = getConfig();
    if (!apiKey) {
      return {
        isError: true,
        content: [{ type: "text", text: "Missing BANK_STATEMENT_PARSER_API_KEY environment variable." }],
      };
    }

    const res = await fetch(`${apiUrl}/api/queue/${encodeURIComponent(queue_id)}`, {
      headers: { "X-Api-Key": apiKey },
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        isError: true,
        content: [{ type: "text", text: `Status check failed (${res.status}): ${text}` }],
      };
    }
    return {
      content: [{ type: "text", text }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
