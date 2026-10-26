export enum DeFiStrategy {
  PerpFunding = 'perp_funding',
  StableLp = 'stable_lp',
  NativeStaking = 'native_staking',
  LoopedBorrow = 'looped_borrow',
}

export enum BucketCategory {
  DryPowder = 'Dry Powder',
  HardAssets = 'Hard Assets',
  Equities = 'Equities',
  SelfCustodyDeFi = 'Self-Custody DeFi',
  MarginBorrow = 'Margin / Borrow',
}

export enum CustodyHygiene {
  ColdSelfCustody = 'Cold / Self-Custody',
  DirectTreasury = 'Direct Treasury',
  CustodialExchange = 'Custodial Exchange',
}

export enum BadgeVariant {
  Green = 'green',
  Amber = 'amber',
  Red = 'red',
  Blue = 'blue',
}

export interface Position {
  id: number;
  name: string;
  bucket: BucketCategory | string;
  custody: CustodyHygiene | string;
  value: number;
  isMorpho?: boolean;
  isDeFi?: boolean;
}

export interface MacroState {
  monthOffset: number;
  sofrRate: number;
  effrRate: number;
  sofrSpreadBps: number;
  srfUsageBillions: number;
  slrRelief: boolean;
  defiStrategy: DeFiStrategy;
  positions: Position[];
}

export interface ConnectionSettings {
  firebaseUrl: string;
  walletAddress: string;
}

export interface SyncBadgeState {
  variant: BadgeVariant;
  text: string;
}

export interface NoticeMessage {
  variant: BadgeVariant;
  text: string;
}

export interface BarAllocationItem {
  bucket: BucketCategory;
  isDebt: boolean;
  value: number;
  actualPct: number;
  targetPct: number;
  drift: number;
  driftTxt: string;
}

export interface ContagionMonitorState {
  status: 'green' | 'amber' | 'red';
  badgeVariant: BadgeVariant;
  badgeText: string;
  strategyTitle: string;
  body: string;
}

export interface RebalanceDirectiveState {
  status: 'green' | 'red';
  maxDriftTxt: string;
  title: string;
  body: string;
}
