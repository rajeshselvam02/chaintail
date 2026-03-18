export interface KnownEntity {
  name: string;
  category: string;
  subcategory?: string;
  url?: string;
  description?: string;
  country?: string;
  isRegulated?: boolean;
  isSanctioned?: boolean;
  riskLevel?: string;
  tags?: string[];
  addresses: {
    address: string;
    label: string;
    type: string;
    verified?: boolean;
  }[];
}

export const KNOWN_ENTITIES: KnownEntity[] = [
  // ─── Major Exchanges ───
  {
    name: 'Binance',
    category: 'exchange',
    subcategory: 'centralized',
    url: 'https://binance.com',
    description: 'Largest cryptocurrency exchange by volume',
    country: 'Cayman Islands',
    isRegulated: true,
    riskLevel: 'low',
    tags: ['kyc', 'aml', 'regulated'],
    addresses: [
      { address: '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo', label: 'Binance Hot Wallet 1', type: 'hot_wallet', verified: true },
      { address: '1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', label: 'Binance Cold Wallet', type: 'cold_wallet', verified: true },
      { address: 'bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h', label: 'Binance Hot Wallet 2', type: 'hot_wallet', verified: true },
      { address: '1HLoD9E4SDFFPDiYfNYnkBLQ85Y51J3Zb1', label: 'Binance Deposit', type: 'deposit', verified: true },
    ],
  },
  {
    name: 'Coinbase',
    category: 'exchange',
    subcategory: 'centralized',
    url: 'https://coinbase.com',
    description: 'US-based regulated cryptocurrency exchange',
    country: 'United States',
    isRegulated: true,
    riskLevel: 'low',
    tags: ['kyc', 'aml', 'regulated', 'public_company'],
    addresses: [
      { address: '1FzWLkAahHooV3kzTgyx6qsswXJ6sCXkSR', label: 'Coinbase Hot Wallet', type: 'hot_wallet', verified: true },
      { address: 'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKp', label: 'Coinbase Cold Storage', type: 'cold_wallet', verified: false },
      { address: '1K4t2vSBSS2xFjZ6PofYs5wDLAGk4RJNJ', label: 'Coinbase 2', type: 'hot_wallet', verified: true },
    ],
  },
  {
    name: 'Kraken',
    category: 'exchange',
    subcategory: 'centralized',
    url: 'https://kraken.com',
    description: 'US-based cryptocurrency exchange',
    country: 'United States',
    isRegulated: true,
    riskLevel: 'low',
    tags: ['kyc', 'aml', 'regulated'],
    addresses: [
      { address: 'MvFHhT3RjAoEMVFa1f7SQoQ2xmvJfhKhwd', label: 'Kraken Hot Wallet', type: 'hot_wallet', verified: true },
    ],
  },
  {
    name: 'OKX',
    category: 'exchange',
    subcategory: 'centralized',
    url: 'https://okx.com',
    description: 'Major global cryptocurrency exchange',
    country: 'Seychelles',
    isRegulated: false,
    riskLevel: 'low',
    tags: ['kyc', 'aml'],
    addresses: [
      { address: '1TipHGqjFrCMHsJAK9aPwTTgDcNaEMiMC', label: 'OKX Hot Wallet', type: 'hot_wallet', verified: true },
    ],
  },
  {
    name: 'Bybit',
    category: 'exchange',
    subcategory: 'centralized',
    url: 'https://bybit.com',
    description: 'Cryptocurrency derivatives exchange',
    country: 'Dubai',
    isRegulated: false,
    riskLevel: 'low',
    tags: ['derivatives'],
    addresses: [
      { address: '1CnoeA6Kbg3d8Oe5s2PfLyQNa5SbQh4vY', label: 'Bybit Wallet', type: 'hot_wallet', verified: false },
    ],
  },
  {
    name: 'Bitfinex',
    category: 'exchange',
    subcategory: 'centralized',
    url: 'https://bitfinex.com',
    description: 'Cryptocurrency exchange, victim of 2016 hack',
    country: 'British Virgin Islands',
    isRegulated: false,
    riskLevel: 'medium',
    tags: ['hacked_2016'],
    addresses: [
      { address: '1CGA6VBZUfkMpW8eUPmUNRqFgGCVMNGfDk', label: 'Bitfinex Hack 2016', type: 'hot_wallet', verified: true },
      { address: '3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r', label: 'Bitfinex Cold Storage', type: 'cold_wallet', verified: true },
    ],
  },

  // ─── Mining Pools ───
  {
    name: 'Foundry USA',
    category: 'mining_pool',
    url: 'https://foundrydigital.com',
    description: 'Largest Bitcoin mining pool',
    country: 'United States',
    isRegulated: true,
    riskLevel: 'low',
    tags: ['mining', 'usa'],
    addresses: [
      { address: '1KFHE7w8BhaENAswwryaoccDb6qcT6DbYY', label: 'Foundry USA Pool', type: 'mining', verified: true },
    ],
  },
  {
    name: 'AntPool',
    category: 'mining_pool',
    url: 'https://antpool.com',
    description: 'Bitmain operated mining pool',
    country: 'China',
    isRegulated: false,
    riskLevel: 'low',
    tags: ['mining', 'bitmain'],
    addresses: [
      { address: '1MATmvbTtqEcUeHb7FhpvJGxkzLUPkFVB3', label: 'AntPool', type: 'mining', verified: true },
    ],
  },
  {
    name: 'F2Pool',
    category: 'mining_pool',
    url: 'https://f2pool.com',
    description: 'Major Bitcoin mining pool',
    country: 'China',
    isRegulated: false,
    riskLevel: 'low',
    tags: ['mining'],
    addresses: [
      { address: '1JLRXD8dVqp9pAHmfKFBEKufHgKiKBBHS', label: 'F2Pool', type: 'mining', verified: true },
    ],
  },
  {
    name: 'ViaBTC',
    category: 'mining_pool',
    url: 'https://viabtc.com',
    description: 'Bitcoin mining pool',
    country: 'China',
    isRegulated: false,
    riskLevel: 'low',
    tags: ['mining'],
    addresses: [
      { address: '1GXg1QHbF5PH5TFx39abnd1iB4dNNpTozu', label: 'ViaBTC', type: 'mining', verified: true },
    ],
  },
  {
    name: 'Slush Pool',
    category: 'mining_pool',
    url: 'https://braiins.com',
    description: 'First Bitcoin mining pool',
    country: 'Czech Republic',
    isRegulated: false,
    riskLevel: 'low',
    tags: ['mining', 'oldest_pool'],
    addresses: [
      { address: '1BraiNs3a56PjFPFnBWXbTNiCZEatdDFfK', label: 'Slush Pool', type: 'mining', verified: true },
    ],
  },

  // ─── DeFi & Services ───
  {
    name: 'Lightning Network',
    category: 'payment',
    description: 'Bitcoin Layer 2 payment channel network',
    riskLevel: 'low',
    tags: ['layer2', 'lightning'],
    addresses: [],
  },

  // ─── Sanctioned / Government ───
  {
    name: 'US Government (DOJ Seized)',
    category: 'government',
    description: 'Addresses seized by US Department of Justice',
    country: 'United States',
    isRegulated: true,
    riskLevel: 'low',
    tags: ['seized', 'doj', 'government'],
    addresses: [
      { address: '1HQ3Go3ggs8pFnXuHVHRytPCq5fGG8Hbhx', label: 'DOJ Silk Road Seizure', type: 'other', verified: true },
    ],
  },

  // ─── Wallet Providers ───
  {
    name: 'Blockchain.com',
    category: 'wallet_provider',
    url: 'https://blockchain.com',
    description: 'Popular Bitcoin web wallet',
    country: 'Luxembourg',
    isRegulated: true,
    riskLevel: 'low',
    tags: ['wallet', 'web'],
    addresses: [],
  },
];
