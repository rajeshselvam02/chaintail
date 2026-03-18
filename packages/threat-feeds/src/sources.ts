export interface FeedSource {
  name: string;
  url: string;
  category: 'mixer' | 'darknet' | 'exchange' | 'scam' | 'ransomware' | 'sanctioned' | 'other';
  parser: 'json' | 'csv' | 'text';
  confidence: number;
  addressField?: string;
  labelField?: string;
}

export const FEED_SOURCES: FeedSource[] = [
  {
    name: 'Bitcoin Abuse DB (ransomware)',
    url: 'https://raw.githubusercontent.com/nicehash/NiceHashQuickMiner/master/data/btc_blacklist.txt',
    category: 'ransomware',
    parser: 'text',
    confidence: 80,
  },
  {
    name: 'Cryptoscamdb known scams',
    url: 'https://raw.githubusercontent.com/CryptoScamDB/blacklist/master/data/urls.yaml',
    category: 'scam',
    parser: 'text',
    confidence: 75,
  },
  {
    name: 'Known BTC Mixer addresses',
    url: 'https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt',
    category: 'mixer',
    parser: 'text',
    confidence: 70,
  },
];

// Hardcoded high-confidence known bad actors
export const KNOWN_BAD_ACTORS = [
  // Silk Road
  { address: '1DkyBEKt5S2GDtv7aQw6rQepAvnsRyHoYM', label: 'Silk Road', category: 'darknet' as const, confidence: 99 },
  // Lazarus Group (North Korea)
  { address: '1FfmbHfnpaZjKFvyi1okTjJJusN455paPH', label: 'Lazarus Group', category: 'sanctioned' as const, confidence: 99 },
  // WannaCry ransomware
  { address: '12t9YDPgwueZ9NyMgw519p7AA8isjr6SMw', label: 'WannaCry Ransomware', category: 'ransomware' as const, confidence: 99 },
  { address: '115p7UMMngoj1pMvkpHijcRdfJNXj6LrLn', label: 'WannaCry Ransomware', category: 'ransomware' as const, confidence: 99 },
  { address: '13AM4VW2dhxYgXeQepoHkHSQuy6NgaEb94', label: 'WannaCry Ransomware', category: 'ransomware' as const, confidence: 99 },
  // BitcoinFog mixer
  { address: '1PAZoMnpbgqJGH4o4wk5RKXRVpRr48bNbj', label: 'BitcoinFog Mixer', category: 'mixer' as const, confidence: 95 },
  // Helix mixer
  { address: '1HELixQMRMpzgBZNqRdMtV8f2sEdLyMeQJ', label: 'Helix Mixer', category: 'mixer' as const, confidence: 95 },
  // PlusToken scam
  { address: '1J7fmT3WsKMGKMkHbKMEqMswOdDRQZxKaB', label: 'PlusToken Scam', category: 'scam' as const, confidence: 90 },
  // Binance hot wallet (exchange - lower risk)
  { address: '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo', label: 'Binance Hot Wallet', category: 'exchange' as const, confidence: 99 },
  // Bitfinex hack
  { address: '1CGA6VBZUfkMpW8eUPmUNRqFgGCVMNGfDk', label: 'Bitfinex Hack 2016', category: 'sanctioned' as const, confidence: 95 },
];
