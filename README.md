# ⛓ ChainTrail

> Open Source Bitcoin AML Forensics & Transaction Trail Tracker

ChainTrail is a real-time Bitcoin transaction monitoring and anti-money laundering (AML) forensics tool. It tracks live mempool transactions, traces fund flows across the blockchain, clusters related addresses, and flags known bad actors.

Built with Node.js, TypeScript, PostgreSQL, Redis, and Next.js. Runs on any Linux system including Android (Termux).



![ChainTrail Dashboard](https://raw.githubusercontent.com/rajeshselvam02/chaintail/main/docs/dashboard.png)



---

## Features

- **Live Mempool Stream** — Real-time Bitcoin transaction monitoring via mempool.space WebSocket
- **Graph Tracer** — Trace fund flows N hops deep using PostgreSQL recursive CTEs
- **Address Clustering** — Group related addresses using common-input ownership heuristic (Union-Find)
- **Threat Intel** — 1,258+ known bad actor addresses (WannaCry, Lazarus Group, Silk Road, mixers)
- **Risk Scoring** — Automatic 0-100 risk score based on proximity to flagged addresses
- **Webhook Alerts** — Real-time notifications via Telegram, Discord, or any HTTP endpoint
- **REST API** — 14 endpoints for programmatic access
- **Mobile Dashboard** — Responsive Next.js UI

---

## Architecture
Bitcoin Network (mempool.space WebSocket)
│
▼
mempool-watcher ──► PostgreSQL ──► graph-tracer
│                │                │
▼                ▼                ▼
Redis           clustering        risk-scorer
│                │                │
└────────────────┴────────────────┘
│
REST API (:3001)
│
Dashboard (:3000)
---

## Monorepo Structure
chaintail/
├── packages/
│   ├── node-connector/     # Bitcoin Core RPC + Blockstream API fallback
│   ├── mempool-watcher/    # Live WebSocket transaction stream
│   ├── graph-tracer/       # Recursive transaction graph traversal
│   ├── clustering/         # Address clustering engine
│   ├── threat-feeds/       # Threat intel sync + webhook alerts
│   ├── api/                # Express REST API
│   ├── shared/             # Shared TypeScript types + DB schema
│   └── dashboard/          # Next.js frontend
---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- npm 9+

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/rajeshselvam02/chaintail.git
cd chaintail
2. Install dependencies
npm install --legacy-peer-deps
3. Configure environment
cp .env.example .env
Edit .env with your settings:
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=chaintail
DB_PASSWORD=chaintail
DB_NAME=chaintail

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Bitcoin (leave USE_API=true if no local node)
USE_API=true
BTC_NETWORK=mainnet

# Optional: Telegram alerts
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Optional: Discord alerts
DISCORD_WEBHOOK_URL=
4. Setup database
# Create PostgreSQL user and database
psql -U postgres -c "CREATE USER chaintail WITH PASSWORD 'chaintail';"
psql -U postgres -c "CREATE DATABASE chaintail OWNER chaintail;"

# Run migrations
npm run migrate
5. Import threat intel
cd packages/threat-feeds
npm run sync
Running
Start each service in a separate terminal:
# Terminal 1 - API server
cd packages/api && npm run dev

# Terminal 2 - Live mempool watcher
cd packages/mempool-watcher && npm run dev

# Terminal 3 - Dashboard
cd packages/dashboard && npm run dev
Open http://localhost:3000 in your browser.
API Reference
Base URL: http://localhost:3001
Method
Endpoint
Description
GET
/api/health
Service health check
GET
/api/address/:address
Address info + risk score
GET
/api/address/:address/transactions
Address transaction history
GET
/api/trace/:address?hops=3
Trace fund flow (backward)
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
List alerts
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
Example: Trace an address
curl "http://localhost:3001/api/trace/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh?hops=5"
Example: Add threat intel
curl -X POST http://localhost:3001/api/threat-intel \
  -H "Content-Type: application/json" \
  -d '{"address":"1BadActor...","label":"Known Scammer","category":"scam","confidence":90}'
Example: Watch an address
curl -X POST http://localhost:3001/api/webhooks/watched \
  -H "Content-Type: application/json" \
  -d '{"address":"bc1q...","label":"My Watch"}'
Graph Tracer
The graph tracer uses PostgreSQL recursive CTEs to traverse the Bitcoin transaction graph:
WITH RECURSIVE tx_graph AS (
  -- Base: start address
  SELECT from_address, to_address, txid, value_satoshi, 1 AS hop, ...
  FROM tx_inputs JOIN transactions JOIN tx_outputs
  WHERE to_address = $1

  UNION ALL

  -- Recursive: follow inputs N hops deep
  SELECT ... FROM tx_graph g
  JOIN tx_inputs ON ...
  WHERE g.hop < $2
    AND NOT (address = ANY(g.path)) -- prevent cycles
)
SELECT * FROM tx_graph ORDER BY hop;
Threat Intel Sources
Source
Category
Entries
ChainTrail built-in
Various
10
CryptoScamDB
Scam
1,163
Public mixer lists
Mixer
85
Total

1,258+
Known addresses include:
WannaCry ransomware wallets
Lazarus Group (North Korea)
Silk Road
BitcoinFog mixer
Helix mixer
PlusToken scam
Running on Android (Termux)
ChainTrail runs fully on Android via Termux + proot:
# Install Termux from F-Droid
pkg install proot-distro
proot-distro install ubuntu
proot-distro login ubuntu

# Inside Ubuntu
apt install nodejs postgresql redis-server git -y
# Follow standard installation steps above
Roadmap
[ ] Multi-hop threat propagation scoring
[ ] OFAC sanctions list auto-sync
[ ] Transaction graph visualization (D3.js)
[ ] Lightning Network support
[ ] CLI tool for scripting
[ ] Docker compose setup
[ ] Ethereum support
Contributing
Pull requests welcome. For major changes please open an issue first.
Fork the repo
Create your branch (git checkout -b feature/my-feature)
Commit your changes (git commit -m 'feat: add my feature')
Push to the branch (git push origin feature/my-feature)
Open a Pull Request
License
MIT License — see LICENSE for details.
Disclaimer
ChainTrail is intended for legitimate blockchain forensics, compliance research, and educational purposes only. Always comply with applicable laws and regulations in your jurisdiction.
Built by @rajeshselvam02
