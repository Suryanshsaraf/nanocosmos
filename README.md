# 🪐 NanoCosmos

> **A zero-install, 100% in-browser Azure Cosmos DB SQL query engine & visual Request Unit (RU) profiler.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.2-purple)](https://vitejs.dev/)
[![Zero Backend](https://img.shields.io/badge/Backend-Zero%20Install-green)](https://github.com)

---

## ⚡ Why NanoCosmos?

Testing and learning **Azure Cosmos DB** has traditionally required either:
1. An active Azure subscription with cloud billing risk.
2. The official Azure Cosmos DB Linux/Windows Emulator, which requires Docker, consumes **3–4 GB of RAM**, and is slow or unsupported on some systems.

**NanoCosmos** solves this by providing a lightweight, in-memory NoSQL query engine and visual playground that runs **100% client-side inside your web browser**. 

No Docker. No cloud account. No credit card. Sub-millisecond latency.

---

## 🚀 Key Features

* **Zero-Setup & In-Browser**: Open `index.html` or launch the Vite dev server. Queries evaluate directly in JavaScript/TypeScript memory.
* **Exact Azure Data Explorer UI**: Built to mirror the Microsoft Azure Portal Data Explorer experience (dark theme, breadcrumbs, JSON results, and query tabs).
* **Live Request Unit (RU) Telemetry**:
  - Automatically calculates Request Charge for point reads, partition-aware filters, and cross-partition aggregations.
  - Generates detailed execution metrics: *Index Lookup Time*, *Document Load Time*, *Query Engine Execution Time*, and *Index Hit Ratio*.
* **Partition Router Simulation**:
  - Detects if a query targets a single logical partition (`isSinglePartition = true`) or triggers an expensive multi-partition fan-out (`isFanout = true`).
  - Explains the architectural trade-offs in plain English.
* **Dynamic Documents & Presets**: Preloaded with a multi-tenant CRM dataset (individual, small business, and enterprise accounts) with flexible schemas.

---

## 🏗️ Architecture

```
                    ┌─────────────────────────┐
                    │      SQL Query String   │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │    CosmosSqlParser      │
                    │   (AST Generation)      │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
     ┌────────────────────────┐      ┌────────────────────────┐
     │ CosmosPartitionManager │      │    CosmosEvaluator     │
     │  (Detect Single vs     │      │  (In-Memory Filtering  │
     │   Fan-out Routing)     │      │   & Aggregations)      │
     └───────────┬────────────┘      └───────────┬────────────┘
                 │                               │
                 └───────────────┬───────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   CosmosRuCalculator    │
                    │ (RU Metering & Timings) │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Data Explorer UI      │
                    │  (Results & Stats Tab)  │
                    └─────────────────────────┘
```

---

## 💻 Quickstart

### 1. Instant Run (No installation required)
You can directly double-click `index.html` in your file explorer or open it in any web browser:
```bash
open index.html
```

### 2. Run with Node.js / Vite
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Run Engine Unit Tests
```bash
node --experimental-strip-types test/run.ts
```

---

## 🔍 Supported Cosmos DB SQL Syntax

NanoCosmos supports core Azure Cosmos DB for NoSQL constructs:

### 1. Partition-Aware Point Lookup
```sql
SELECT * FROM c
WHERE c.id = "customer_001"
AND c.customerType = "individual"
```
* **Performance:** Single-partition route. ~2.83 RUs, sub-10ms execution.

### 2. Nested Field & Array Filtering
```sql
SELECT * FROM c
WHERE c.customerType = "individual"
AND c.preferences.serviceInterests[0] = "strategic consulting"
```

### 3. Cross-Partition Aggregations
```sql
SELECT c.customerType,
       COUNT(1) AS customerCount,
       AVG(c.relationshipData.engagementScore) AS avgEngagement
FROM c
GROUP BY c.customerType
```
* **Performance:** Multi-partition fan-out. ~12.45 RUs with client-side merge overhead.

---

## 📊 Cosmos DB RU Calculation Formula

NanoCosmos models Azure Cosmos DB's provisioned throughput metrics:
* **Point Read (1 KB):** ~1.0 RU
* **Single Partition Query:** 
  $$\text{RU} = 2.2 + (\text{OutputSizeKB} \times 0.4) + (\text{RetrievedDocs} \times 0.15)$$
* **Cross-Partition Fan-Out:** 
  $$\text{RU} = (\text{Partitions} \times 2.6) + \text{AggregationOverhead} + (\text{Partitions} \times 0.4)$$

---

## 🛠️ Tech Stack

* **Language:** TypeScript 5.4 / Vanilla JS
* **Tooling:** Vite, Node.js
* **Design:** Azure Fluent UI / Slate Dark Theme
* **Runtime:** 100% Client-Side In-Memory Execution

---

## 📄 License

MIT License. Designed and maintained by [Suryansh Saraf](https://github.com).
