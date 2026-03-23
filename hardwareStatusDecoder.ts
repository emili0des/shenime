export interface DecodedDeviceStatus {
  device: string;
  deviceCode: string;
  status: 'OK' | 'Warning' | 'Suspended' | 'Critical' | 'Disabled' | 'Not Configured' | 'Unknown';
  statusLevel: number;
  supply: string;
  supplyCode: string;
  additional: string;
  additionalCode: string;
  isHealthy: boolean;
  isConfigured: boolean;
  raw: string;
}

const DEVICE_IDENTIFIERS: Record<string, string> = {
  SF: 'Safe Door',
  CR: 'Card Reader',
  CB: 'Card Bin',
  EJ: 'Electronic Journal',
  PU: 'Receipt Printer',
  DI: 'Dispenser',
  RJ: 'Reject Bin',
  C1: 'Cassette 1',
  C2: 'Cassette 2',
  C3: 'Cassette 3',
  C4: 'Cassette 4',
  C5: 'Cassette 5',
  C6: 'Cassette 6',
  C7: 'Cassette 7',
  EC: 'Encryptor',
  BT: 'Bill Trap',
  PR: 'Presenter',
  NA: 'Bunch Note Acceptor',
};

const DEVICE_STATUS_MAP: Record<string, 'OK' | 'Warning' | 'Suspended' | 'Critical' | 'Disabled'> = {
  '0': 'OK',
  '3': 'Warning',
  '5': 'Suspended',
  '7': 'Critical',
  '9': 'Disabled',
};

const SUPPLY_STATUS_MAP: Record<string, string> = {
  '00': 'No Overfill Condition',
  '01': 'Sufficient Supply',
  '05': 'Low Supply',
  '06': 'Supplies Gone',
  '07': 'Overfill Condition',
  '08': 'Not Installed or Unknown',
  '09': 'Product Not Configured',
};

const ADDITIONAL_DATA_MAP: Record<string, string> = {
  '00': 'Enabled',
  '01': 'Closed',
  '03': 'In',
  '04': 'Open',
  '05': 'Out',
  '07': 'Disabled',
};

export function decodeDeviceStatus(statusCode: string | null): DecodedDeviceStatus | null {
  if (!statusCode) return null;

  const trimmed = statusCode.trim().toUpperCase();

  if (trimmed === '' || trimmed === ' ') {
    return {
      device: 'Device',
      deviceCode: '',
      status: 'OK',
      statusLevel: 0,
      supply: 'All Normal',
      supplyCode: '',
      additional: 'Fully Functional',
      additionalCode: '',
      isHealthy: true,
      isConfigured: true,
      raw: statusCode,
    };
  }

  if (trimmed.includes('-')) {
    return {
      device: 'Unknown Device',
      deviceCode: '',
      status: 'Not Configured',
      statusLevel: 99,
      supply: 'Not Available',
      supplyCode: '',
      additional: 'Disconnected',
      additionalCode: '',
      isHealthy: false,
      isConfigured: false,
      raw: statusCode,
    };
  }

  if (trimmed.length >= 8) {
    const deviceCode = trimmed.substring(0, 2);
    const statusChar = trimmed[3];
    const supplyCode = trimmed.substring(4, 6);
    const additionalCode = trimmed.substring(6, 8);

    const device = DEVICE_IDENTIFIERS[deviceCode] || `Unknown (${deviceCode})`;
    const status = DEVICE_STATUS_MAP[statusChar] || 'Unknown';
    const supply = SUPPLY_STATUS_MAP[supplyCode] || `Unknown (${supplyCode})`;
    const additional = ADDITIONAL_DATA_MAP[additionalCode] || `Unknown (${additionalCode})`;

    const statusLevel = parseInt(statusChar, 10);

    const isAllZeros = statusChar === '0' && supplyCode === '00' && additionalCode === '00';

    return {
      device,
      deviceCode,
      status: isAllZeros ? 'OK' : status,
      statusLevel: isAllZeros ? 0 : statusLevel,
      supply: isAllZeros ? 'All Normal' : supply,
      supplyCode,
      additional: isAllZeros ? 'Fully Functional' : additional,
      additionalCode,
      isHealthy: isAllZeros || (statusLevel === 0 && supplyCode === '01' && additionalCode === '00'),
      isConfigured: supplyCode !== '08' && supplyCode !== '09',
      raw: statusCode,
    };
  }

  return null;
}

export function getStatusColor(status: 'OK' | 'Warning' | 'Suspended' | 'Critical' | 'Disabled' | 'Not Configured' | 'Unknown'): string {
  switch (status) {
    case 'OK':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Warning':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Suspended':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Critical':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Disabled':
      return 'bg-slate-50 text-slate-700 border-slate-200';
    case 'Not Configured':
      return 'bg-slate-50 text-slate-500 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export function getStatusIcon(status: 'OK' | 'Warning' | 'Suspended' | 'Critical' | 'Disabled' | 'Not Configured' | 'Unknown'): string {
  switch (status) {
    case 'OK':
      return '✓';
    case 'Warning':
      return '⚠';
    case 'Suspended':
      return '⏸';
    case 'Critical':
      return '✕';
    case 'Disabled':
      return '○';
    case 'Not Configured':
      return '−';
    default:
      return '?';
  }
}
