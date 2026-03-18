#!/bin/bash
echo "🚀 Starting ChainTrail..."

# Start PostgreSQL
su - postgres -c "/usr/lib/postgresql/17/bin/pg_ctl -D /var/lib/postgresql/17/main -l /var/lib/postgresql/17/main/pg_log.log start" 2>/dev/null
echo "✅ PostgreSQL started"

# Start Redis
redis-server --daemonize yes 2>/dev/null
echo "✅ Redis started"

sleep 2

echo ""
echo "Now start these in separate Termux sessions:"
echo ""
echo "  Session 1 - API:"
echo "  cd ~/chaintail/packages/api && NODE_OPTIONS='' npm run dev"
echo ""
echo "  Session 2 - Mempool Watcher:"
echo "  cd ~/chaintail/packages/mempool-watcher && NODE_OPTIONS='' npm run dev"
echo ""
echo "  Session 3 - Dashboard:"
echo "  NODE_OPTIONS='' ~/chaintail/node_modules/.bin/next dev -H 127.0.0.1 -p 3000 --cwd ~/chaintail/packages/dashboard"
echo ""
echo "  Browser: http://127.0.0.1:3000"
