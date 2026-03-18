# ⛓ ChainTrail

> Open Source Bitcoin AML Forensics & Transaction Trail Tracker

[

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

](LICENSE)
[

![Node.js](https://img.shields.io/badge/Node.js-22-green.svg)

](https://nodejs.org)
[

![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)

](https://typescriptlang.org)
[

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791.svg)

](https://postgresql.org)

ChainTrail is a real-time Bitcoin transaction monitoring and AML forensics platform. It streams every live Bitcoin transaction via WebSocket, traces fund flows across the blockchain graph, clusters related addresses, and automatically flags known bad actors.

---

## Architecture

```mermaid
flowchart TD
    A[Bitcoin Network] -->|WebSocket - every live tx| B[mempool-watcher]
    B --> C[(PostgreSQL)]
    B --> D[(Redis Cache)]
    C --> E[graph-tracer]
    C --> F[clustering]
    C --> G[threat-feeds]
    E --> H[REST API :3001]
    F --> H
    G --> H
    H --> I[Dashboard :3000]
    G -->|alerts| J[Telegram / Discord]
Graph Tracer Flow
flowchart TD
    A[Target Address] --> B[Fetch transactions from Blockstream API]
    B --> C[Save inputs and outputs to PostgreSQL]
    C --> D[Run recursive CTE query]
    D --> E[Hop 1 - addresses that sent to target]
    E --> F[Ingest their transactions]
    F --> G[Hop 2 - addresses that sent to Hop 1]
    G --> H[Ingest their transactions]
    H --> I[Hop N - repeat until max hops]
    I --> J[Check all addresses against threat intel]
    J --> K{Match found?}
    K -->|Yes| L[Flag address - raise risk score]
    K -->|No| M[Mark as clean]
    L --> N[Return result with risk score 0-100]
    M --> N
Risk Scoring Flow
flowchart LR
    A[Address] --> B{In threat intel?}
    B -->|Yes| C[Base score from category]
    B -->|No| D{Connected to flagged address?}
    C --> E[Score = confidence percent]
    D -->|Yes| F[Score decays with hop distance]
    D -->|No| G[Score = 0 LOW]
    F --> H[Final risk score 0 to 100]
    E --> H
    G --> H
    H --> I{Score level}
    I -->|80 plus| J[CRITICAL]
    I -->|60 to 79| K[HIGH]
    I -->|30 to 59| L[MEDIUM]
    I -->|0 to 29| M[LOW]
Database Schema
erDiagram
    transactions {
        uuid id PK
        text txid
        int block_height
        timestamptz timestamp
        bigint fee
        boolean is_confirmed
    }
    tx_inputs {
        uuid id PK
        text txid FK
        text from_address
        bigint value_satoshi
        int vin_index
    }
    tx_outputs {
        uuid id PK
        text txid FK
        text to_address
        bigint value_satoshi
        int vout_index
    }
    addresses {
        uuid id PK
        text address
        uuid cluster_id FK
        int risk_score
        text[] labels
    }
    clusters {
        uuid id PK
        text label
        text risk_level
    }
    threat_intel {
        uuid id PK
        text address
        text label
        text category
        int confidence
    }
    alerts {
        uuid id PK
        text address
        text txid
        text reason
        text severity
    }
    transactions ||--o{ tx_inputs : has
    transactions ||--o{ tx_outputs : has
    clusters ||--o{ addresses : groups
Features
Feature
Description
Live Mempool Stream
WebSocket to mempool.space - every Bitcoin tx pushed instantly
Graph Tracer
Trace fund flows N hops deep using PostgreSQL recursive CTEs
Address Clustering
Group related addresses using Union-Find and common-input heuristic
Risk Scoring
Score addresses 0 to 100 based on proximity to known bad actors
Threat Intel
1258+ known bad actors - WannaCry, Lazarus Group, Silk Road, mixers
Webhook Alerts
Telegram, Discord, or HTTP alerts when watched addresses hit mempool
Mobile Dashboard
Responsive Next.js UI - works on Android
REST API
14 endpoints for programmatic access
Monorepo Structure
chaintail/
├── packages/
│   ├── node-connector      Bitcoin Core RPC and Blockstream API fallback
│   ├── mempool-watcher     Live WebSocket transaction stream
│   ├── graph-tracer        Recursive transaction graph traversal
│   ├── clustering          Address clustering engine
│   ├── threat-feeds        Threat intel sync and webhook alerts
│   ├── api                 Express REST API with 14 endpoints
│   ├── shared              TypeScript types and PostgreSQL schema
│   └── dashboard           Next.js mobile-responsive UI
├── .env.example
└── package.json
Quick Start
Prerequisites
Node.js 18+
PostgreSQL 14+
Redis 6+
Install
git clone https://github.com/rajeshselvam02/chaintail.git
cd chaintail
npm install --legacy-peer-deps
cp .env.example .env
Database
psql -U postgres -c "CREATE USER chaintail WITH PASSWORD 'chaintail';"
psql -U postgres -c "CREATE DATABASE chaintail OWNER chaintail;"
npm run migrate
Import Threat Intel
cd packages/threat-feeds
npm run sync
cd ../..
Start
# Terminal 1 - API server
cd packages/api && npm run dev

# Terminal 2 - Mempool watcher
cd packages/mempool-watcher && npm run dev

# Terminal 3 - Dashboard
cd packages/dashboard && npm run dev
Open http://localhost:3000
API Reference
Base URL: http://localhost:3001
Method
Endpoint
Description
GET
/api/health
Health check postgres and redis
GET
/api/address/:address
Address info risk score and cluster
GET
/api/address/:address/transactions
Transaction history
GET
/api/trace/:address?hops=3
Trace fund flow backward
POST
/api/trace
Trace with full options
GET
/api/cluster/:address
Get address cluster
POST
/api/cluster/run
Run clustering job
GET
/api/alerts
List all alerts
GET
/api/mempool/stats
Live mempool statistics
GET
/api/mempool/recent
Recent mempool transactions
GET
/api/threat-intel
List threat intel entries
POST
/api/threat-intel
Add threat intel entry
GET
/api/webhooks/watched
List watched addresses
POST
/api/webhooks/watched
Watch an address
Threat Intelligence
Source
Category
Count
Confidence
WannaCry ransomware
Ransomware
3
99%
Lazarus Group North Korea
Sanctioned
1
99%
Silk Road
Darknet
1
99%
BitcoinFog and Helix mixers
Mixer
2
95%
PlusToken scam
Scam
1
90%
CryptoScamDB
Scam
1163
75%
Public mixer lists
Mixer
85
70%
Total

1258+

Android Support
pkg install proot-distro
proot-distro install ubuntu
proot-distro login ubuntu
apt install nodejs postgresql redis-server git -y
Then follow the standard installation steps above. Dashboard runs at http://127.0.0.1:3000
Roadmap
[x] Live WebSocket mempool stream
[x] N-hop recursive graph tracer
[x] Address clustering Union-Find
[x] Threat intel sync 1258+ addresses
[x] REST API 14 endpoints
[x] Mobile-responsive dashboard
[x] Telegram and Discord webhook alerts
[ ] D3.js interactive graph visualization
[ ] OFAC sanctions list auto-sync
[ ] Docker compose setup
[ ] Lightning Network support
[ ] Ethereum support
[ ] CLI tool
Contributing
Fork the repo
Create your branch: git checkout -b feature/my-feature
Commit: git commit -m 'feat: add my feature'
Push: git push origin feature/my-feature
Open a Pull Request
Disclaimer
ChainTrail is intended for legitimate blockchain forensics, compliance research, and educational purposes only.
License
MIT - see LICENSE for details.
Built by @rajeshselvam02
