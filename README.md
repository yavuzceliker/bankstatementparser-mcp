# `bankstatementparser-mcp` — Bank Statement Parser MCP Server

Model Context Protocol (MCP) server for [Bank Statement Parser](https://bankstatementparser.net). Lets Claude Desktop, Cursor, Windsurf, Cline, and custom MCP agents convert digital, scanned (OCR), and password-protected bank statement PDFs into balance-verified JSON, CSV, QuickBooks (`.qbo` / `.iif`), `.ofx`, Xero CSV, or Tally XML.

- **Try in browser (15 free pages, no card):** https://bankstatementparser.net
- **API & Documentation:** https://bankstatementparser.net/en/docs
- **Non-expiring page packs from $19** · **Zero-Retention in-memory mode (`zero_retention: true` default)**

## Quick Setup (Claude Desktop / Cursor / Windsurf)

```json
{
  "mcpServers": {
    "bank-statement-parser": {
      "command": "npx",
      "args": ["-y", "bankstatementparser-mcp"],
      "env": {
        "BANK_STATEMENT_PARSER_API_KEY": "pex_your_api_key_here"
      }
    }
  }
}
```

## Available Tools

- **`parse_bank_statement`**: Upload a local PDF path (`file_path`), optional `password`, `format` (`json | csv | xero_csv | qbo | ofx | iif | tally_xml`), and `zero_retention` (`true` by default for strict in-memory processing). Every JSON response includes a `confidence` block with `verifiedRows`, `verifiedRate`, and running-balance `reconciliation`.
- **`check_extraction_status`**: Poll an async `queue_id` returned on HTTP `202` for scanned/unseen bank layouts.
