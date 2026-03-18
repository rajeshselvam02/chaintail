# ChainTrail

Open Source Bitcoin AML Forensics and Transaction Trail Tracker

ChainTrail monitors live Bitcoin transactions, traces fund flows across the blockchain, clusters related addresses, and flags known bad actors in real time.

---

## What it does

- Streams every live Bitcoin transaction via mempool.space WebSocket
- Traces fund origins N hops deep through the transaction graph
- Groups related addresses into clusters using common-input heuristic
- Scores addresses 0-100 based on proximity to known bad actors
- Alerts you instantly when a watched address appears in the mempool
- Ships with 1,258 known bad actor addresses built in

---

## Tech Stack

- **Backend** — Node.js, TypeScript, Express
- **Database** — PostgreSQL (recursive CTEs for graph traversal)
- **Cache** — Redis
- **Frontend** — Next.js, Tailwind CSS
- **Data** — mempool.space WebSocket API, Blockstream API

---

## Project Structure
chaintail/
├── packages/
│   ├── node-connector/     Bitcoin Core RPC + Blockstream API
│   ├── mempool-watcher/    Live WebSocket transaction stream
│   ├── graph-tracer/       Recursive transaction graph traversal
│   ├── clustering/         Address clustering (Union-Find)
│   ├── threat-feeds/       Threat intel sync + webhook alerts
│   ├── api/                REST API (14 endpoints)
│   ├── shared/             TypeScript types + DB schema
│   └── dashboard/          Next.js mobile-responsive UI
---

## Installation

**Requirements:** Node.js 18+, PostgreSQL 14+, Redis 6+

```bash
git clone https://github.com/rajeshselvam02/chaintail.git
cd chaintail
npm install --legacy-peer-deps
cp .env.example .env
Edit .env with your database credentials, then:
npm run migrate
cd packages/threat-feeds && npm run sync
Running
# Terminal 1 - API
cd packages/api && npm run dev

# Terminal 2 - Mempool watcher
cd packages/mempool-watcher && npm run dev

# Terminal 3 - Dashboard
cd packages/dashboard && npm run dev
Open http://localhost:3000
API Endpoints
Method
Endpoint
Description
GET
/api/health
Health check
GET
/api/address/:address
Address info and risk score
GET
/api/trace/:address
Trace fund flow
POST
/api/trace
Trace with options
GET
/api/cluster/:address
Get address cluster
GET
/api/alerts
List alerts
GET
/api/mempool/stats
Live mempool stats
GET
/api/mempool/recent
Recent transactions
GET
/api/threat-intel
Threat intel list
POST
/api/threat-intel
Add threat intel
GET
/api/webhooks/watched
Watched addresses
POST
/api/webhooks/watched
Watch an address
Threat Intel
Built-in known bad actors include WannaCry ransomware, Lazarus Group (North Korea), Silk Road, BitcoinFog mixer, Helix mixer, and PlusToken scam wallets. Additional entries are synced from CryptoScamDB and public mixer lists totalling 1,258+ addresses.
Android Support
Runs fully on Android via Termux and proot-distro Ubuntu. No cloud required.
Roadmap
OFAC sanctions list auto-sync
Transaction graph visualization
Docker compose setup
Lightning Network support
Ethereum support
License
MIT
Disclaimer
ChainTrail is intended for legitimate blockchain forensics, compliance research, and educational purposes only.
Built by Rajesh — https://github.com/rajeshselvam02
