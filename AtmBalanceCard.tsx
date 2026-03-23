import { AtmBalance } from '../lib/api';
import { Banknote, TrendingDown, Wallet } from 'lucide-react';

interface AtmBalanceCardProps {
  balance: AtmBalance;
  onClick: () => void;
}

export function AtmBalanceCard({ balance, onClick }: AtmBalanceCardProps) {
  const remainingPercentage = balance.initial_balance_all
    ? ((balance.remaining_balance_all || 0) / balance.initial_balance_all) * 100
    : 0;

  const getStatusColor = (percentage: number) => {
    if (percentage > 50) return 'bg-emerald-500';
    if (percentage > 20) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const dispensed = (balance.initial_balance_all ?? 0) - (balance.remaining_balance_all ?? 0);

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer p-6 border border-slate-100 hover:border-slate-200 overflow-hidden relative"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/0 group-hover:from-blue-50 group-hover:to-blue-50/40 transition-all duration-300" />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              {balance.atm_name || balance.atm_id || 'Unknown ATM'}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-slate-500 font-medium">{balance.terminal_id}</p>
              {balance.branch && (
                <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                  Branch {balance.branch}
                </span>
              )}
            </div>
          </div>
          <div className={`w-4 h-4 rounded-full shadow-lg ${getStatusColor(remainingPercentage)} animate-pulse`} />
        </div>

        <div className="space-y-3.5">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
            <div className="flex items-center gap-2 text-slate-600">
              <Wallet className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Remaining</span>
            </div>
            <span className="font-bold text-slate-900">
              {formatCurrency(balance.remaining_balance_all)}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
            <div className="flex items-center gap-2 text-slate-600">
              <TrendingDown className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">Dispensed</span>
            </div>
            <span className="text-slate-700 font-semibold">
              {formatCurrency(dispensed)}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
            <div className="flex items-center gap-2 text-slate-600">
              <Banknote className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium">Withdrawals</span>
            </div>
            <span className="text-slate-700 font-semibold">{balance.no_withdrawals_all || 0}</span>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200">
            <div className="flex justify-between items-center text-xs text-slate-500 mb-3 font-medium">
              <span>
                {balance.balance_date
                  ? new Date(balance.balance_date).toLocaleDateString()
                  : 'No date'}
              </span>
              <span className="font-bold text-slate-700">{remainingPercentage.toFixed(0)}% remaining</span>
            </div>
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getStatusColor(remainingPercentage)} transition-all duration-500 rounded-full`}
                style={{ width: `${remainingPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
