export const TRACE_BACKWARD = `
WITH RECURSIVE tx_graph AS (
  SELECT
    i.from_address,
    o.to_address,
    t.txid,
    o.value_satoshi,
    1 AS hop,
    ARRAY[COALESCE(i.from_address, 'coinbase')] AS path,
    ARRAY[t.txid] AS tx_path
  FROM tx_inputs i
  JOIN transactions t ON t.txid = i.txid
  JOIN tx_outputs o ON o.txid = t.txid
  WHERE o.to_address = $1

  UNION ALL

  SELECT
    i.from_address,
    o.to_address,
    t.txid,
    o.value_satoshi,
    g.hop + 1,
    g.path || COALESCE(i.from_address, 'coinbase'),
    g.tx_path || t.txid
  FROM tx_graph g
  JOIN tx_inputs i ON i.txid = (
    SELECT txid FROM tx_outputs
    WHERE to_address = g.from_address
    LIMIT 1
  )
  JOIN transactions t ON t.txid = i.txid
  JOIN tx_outputs o ON o.txid = t.txid
  WHERE g.hop < $2
    AND i.from_address IS NOT NULL
    AND NOT (COALESCE(i.from_address, '') = ANY(g.path))
)
SELECT DISTINCT
  from_address,
  to_address,
  txid,
  value_satoshi,
  hop,
  path,
  tx_path
FROM tx_graph
ORDER BY hop ASC;
`;

export const TRACE_FORWARD = `
WITH RECURSIVE tx_graph AS (
  SELECT
    i.from_address,
    o.to_address,
    t.txid,
    o.value_satoshi,
    1 AS hop,
    ARRAY[COALESCE(o.to_address, 'unknown')] AS path,
    ARRAY[t.txid] AS tx_path
  FROM tx_outputs o
  JOIN transactions t ON t.txid = o.txid
  JOIN tx_inputs i ON i.txid = t.txid
  WHERE i.from_address = $1

  UNION ALL

  SELECT
    i.from_address,
    o.to_address,
    t.txid,
    o.value_satoshi,
    g.hop + 1,
    g.path || COALESCE(o.to_address, 'unknown'),
    g.tx_path || t.txid
  FROM tx_graph g
  JOIN tx_inputs i ON i.from_address = g.to_address
  JOIN transactions t ON t.txid = i.txid
  JOIN tx_outputs o ON o.txid = t.txid
  WHERE g.hop < $2
    AND o.to_address IS NOT NULL
    AND NOT (COALESCE(o.to_address, '') = ANY(g.path))
)
SELECT DISTINCT
  from_address,
  to_address,
  txid,
  value_satoshi,
  hop,
  path,
  tx_path
FROM tx_graph
ORDER BY hop ASC;
`;

export const CHECK_THREAT_INTEL = `
SELECT
  a.address,
  t.label,
  t.category,
  t.source,
  t.confidence
FROM unnest($1::text[]) AS a(address)
JOIN threat_intel t ON t.address = a.address;
`;

export const GET_ADDRESS_RISK = `
SELECT address, risk_score, labels
FROM addresses
WHERE address = ANY($1::text[]);
`;

export const UPSERT_ADDRESS = `
INSERT INTO addresses (address, risk_score, labels, first_seen, last_seen, tx_count)
VALUES ($1, $2, $3, NOW(), NOW(), 1)
ON CONFLICT (address) DO UPDATE SET
  risk_score = GREATEST(addresses.risk_score, EXCLUDED.risk_score),
  labels = EXCLUDED.labels,
  last_seen = NOW(),
  tx_count = addresses.tx_count + 1;
`;

export const SAVE_TRACE_RESULT = `
INSERT INTO alerts (address, txid, reason, severity, metadata)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT DO NOTHING;
`;
