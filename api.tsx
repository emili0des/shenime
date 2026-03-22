const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7143';

export interface AtmBalance {
  record_id?: number | null;
  file_name?: string | null;
  balance_date?: string | null;
  atm_name?: string | null;
  atm_id?: string | null;
  terminal_id?: string | null;
  branch?: string | null;
  initial_balance_all?: number | null;
  remaining_balance_all?: number | null;
  no_transactions_all?: number | null;
  no_withdrawals_all?: number | null;
  eur_initial?: number | null;
  eur_remaining?: number | null;
  timestamp?: string | null;
}

export interface AtmStatus {
  record_id?: number | null;
  file_name?: string | null;
  file_date?: string | null;
  atm_pid?: string | null;
  atm_name?: string | null;
  status?: string | null;
  net?: string | null;
  crd_reader?: string | null;
  dispenser?: string | null;
  encryptor?: string | null;
  depository?: string | null;
  bil_cas1?: string | null;
  bil_cas2?: string | null;
  bil_cas3?: string | null;
  bil_cas4?: string | null;
  bil_cas5?: string | null;
  bil_cas6?: string | null;
  bil_cas7?: string | null;
  owner?: string | null;
  sup_vs?: string | null;
}

export async function fetchLatestBalances(): Promise<AtmBalance[]> {
  const response = await fetch(`${API_URL}/api/atm/balances`);
  if (!response.ok) {
    throw new Error(`Failed to fetch balances: ${response.status}`);
  }
  return response.json();
}

export async function fetchLatestStatuses(): Promise<AtmStatus[]> {
  const response = await fetch(`${API_URL}/api/atm/statuses`);
  if (!response.ok) {
    throw new Error(`Failed to fetch statuses: ${response.status}`);
  }
  return response.json();
}
