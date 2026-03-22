import { useState, useEffect, useRef } from 'react';
import { AtmBalance, AtmStatus, fetchLatestBalances, fetchLatestStatuses } from '../lib/api';
import { AtmBalanceCard } from './AtmBalanceCard';
import { AtmStatusTable } from './AtmStatusTable';
import { AtmDetailsModal } from './AtmDetailsModal';
import { TrendIndicator } from './TrendIndicator';
import { Search, AlertTriangle, CheckCircle, Activity, Clock, Zap, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { decodeDeviceStatus } from '../lib/hardwareStatusDecoder';
import { snapshotManager, DataChange } from '../lib/dataContext';

export function Dashboard() {
  const [balances, setBalances] = useState<AtmBalance[]>([]);
  const [statuses, setStatuses] = useState<AtmStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAtm, setSelectedAtm] = useState<AtmBalance | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'critical'>('all');
  const [refreshInterval, setRefreshInterval] = useState<10 | 60 | 300 | 600>(60);
  const [hardwareFilter, setHardwareFilter] = useState<string>('all');
  const [chartRefresh, setChartRefresh] = useState(0);
  const [showHealthyBalance, setShowHealthyBalance] = useState(false);
  const [dataChanges, setDataChanges] = useState<DataChange>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      fetchData();
    }, refreshInterval * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshInterval]);

  const fetchData = async () => {
    if (balances.length === 0) {
      setLoading(true);
    }
    await Promise.all([fetchBalances(), fetchStatuses()]);
    setLoading(false);
    setChartRefresh(prev => prev + 1);
  };

  const fetchBalances = async () => {
    try {
      const data = await fetchLatestBalances();
      if (data && data.length > 0) {
        const latestFileName = data[0].file_name;
        const isNewFile = snapshotManager.isNewFile(latestFileName);

        setBalances(data);

        if (isNewFile) {
          const stats = {
            total: data.length,
            critical: data.filter((b) => {
              const pct = b.initial_balance_all
                ? ((b.remaining_balance_all || 0) / b.initial_balance_all) * 100
                : 0;
              return pct <= 20;
            }).length,
            low: data.filter((b) => {
              const pct = b.initial_balance_all
                ? ((b.remaining_balance_all || 0) / b.initial_balance_all) * 100
                : 0;
              return pct > 20 && pct <= 50;
            }).length,
          };
          snapshotManager.updateSnapshot(
            latestFileName,
            data[0].balance_date || '',
            data,
            [],
            stats,
            null
          );
        }
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  const fetchStatuses = async () => {
    try {
      const data = await fetchLatestStatuses();
      if (data && data.length > 0) {
        const latestFileName = data[0].file_name;
        const isNewFile = snapshotManager.isNewFile(latestFileName);

        setStatuses(data);

        if (isNewFile) {
          const hardwareStatusData = data.reduce((acc, status) => {
            const components = [status.status, status.net, status.crd_reader, status.dispenser, status.encryptor, status.depository];
            const decoded = components.map(c => decodeDeviceStatus(c));
            const configuredComponents = decoded.filter(d => d && d.isConfigured);
            const hasCritical = configuredComponents.some(d => d?.status === 'Critical');
            const hasWarning = configuredComponents.some(d => d?.status === 'Warning' || d?.status === 'Suspended');
            const allHealthy = configuredComponents.every(d => d?.status === 'OK');

            if (hasCritical) acc.errors += 1;
            else if (hasWarning) acc.warnings += 1;
            else if (allHealthy || configuredComponents.length === 0) acc.healthy += 1;

            return acc;
          }, { healthy: 0, errors: 0, warnings: 0 });

          const currentSnapshot = snapshotManager.getCurrentSnapshot();
          if (currentSnapshot) {
            snapshotManager.updateSnapshot(
              latestFileName,
              currentSnapshot.date,
              currentSnapshot.balances,
              data,
              currentSnapshot.balanceStats,
              hardwareStatusData
            );
          }

          const changes = snapshotManager.getChanges();
          setDataChanges(changes);
        }
      }
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
  };

  const filteredBalances = balances.filter((balance) => {
    const matchesSearch =
      balance.atm_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      balance.atm_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      balance.terminal_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      balance.branch?.toString().includes(searchTerm);

    if (!matchesSearch) return false;

    const remainingPercentage = balance.initial_balance_all
      ? ((balance.remaining_balance_all || 0) / balance.initial_balance_all) * 100
      : 0;

    if (searchTerm) {
      return true;
    }

    if (filterStatus === 'all') {
      if (!showHealthyBalance) {
        return remainingPercentage <= 50;
      }
      return true;
    }

    if (filterStatus === 'critical') return remainingPercentage <= 20;
    if (filterStatus === 'low') return remainingPercentage > 20 && remainingPercentage <= 50;

    return true;
  });

  const stats = {
    total: balances.length,
    critical: balances.filter((b) => {
      const pct = b.initial_balance_all
        ? ((b.remaining_balance_all || 0) / b.initial_balance_all) * 100
        : 0;
      return pct <= 20;
    }).length,
    low: balances.filter((b) => {
      const pct = b.initial_balance_all
        ? ((b.remaining_balance_all || 0) / b.initial_balance_all) * 100
        : 0;
      return pct > 20 && pct <= 50;
    }).length,
    totalBalance: balances.reduce((sum, b) => sum + (b.remaining_balance_all || 0), 0),
  };

  const balanceChartData = [
    { name: 'Critical (<20%)', value: stats.critical, color: '#ef4444' },
    { name: 'Low (20-50%)', value: stats.low, color: '#f59e0b' },
    { name: 'Healthy (>50%)', value: stats.total - stats.critical - stats.low, color: '#10b981' },
  ];

  const hardwareStatusData = statuses.reduce((acc, status) => {
    const components = [status.status, status.net, status.crd_reader, status.dispenser, status.encryptor, status.depository];
    const decoded = components.map(c => decodeDeviceStatus(c));

    const configuredComponents = decoded.filter(d => d && d.isConfigured);
    const hasCritical = configuredComponents.some(d => d?.status === 'Critical');
    const hasWarning = configuredComponents.some(d => d?.status === 'Warning' || d?.status === 'Suspended');
    const allHealthy = configuredComponents.every(d => d?.status === 'OK');

    if (hasCritical) {
      acc.errors += 1;
    } else if (hasWarning) {
      acc.warnings += 1;
    } else if (allHealthy || configuredComponents.length === 0) {
      acc.healthy += 1;
    }
    return acc;
  }, { healthy: 0, errors: 0, warnings: 0 });

  const errorTypeData = statuses.reduce((acc, status) => {
    const components = [
      { name: 'status', value: status.status },
      { name: 'net', value: status.net },
      { name: 'crd_reader', value: status.crd_reader },
      { name: 'dispenser', value: status.dispenser },
      { name: 'encryptor', value: status.encryptor },
      { name: 'depository', value: status.depository }
    ];

    components.forEach(comp => {
      const decoded = decodeDeviceStatus(comp.value);
      if (decoded && decoded.status === 'Critical' && decoded.isConfigured) {
        const existing = acc.find(e => e.name === comp.name);
        if (existing) {
          existing.value += 1;
        } else {
          acc.push({ name: comp.name, value: 1 });
        }
      }
    });

    return acc;
  }, [] as { name: string; value: number }[]);

  const errorTypeColors: { [key: string]: string } = {
    status: '#dc2626',
    net: '#f97316',
    crd_reader: '#eab308',
    dispenser: '#d946ef',
    encryptor: '#6366f1',
    depository: '#8b5cf6'
  };

  const errorTypeChartData = errorTypeData
    .map(item => ({
      ...item,
      name: item.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      color: errorTypeColors[item.name] || '#6b7280'
    }))
    .filter(item => item.value > 0);

  const hardwareChartData = [
    { name: 'Healthy', value: hardwareStatusData.healthy, color: '#10b981' },
    { name: 'Errors', value: hardwareStatusData.errors, color: '#ef4444' },
    { name: 'Warnings', value: hardwareStatusData.warnings, color: '#f59e0b' },
  ].filter(item => item.value > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400/30 border-t-blue-400 mx-auto"></div>
          <p className="mt-6 text-blue-200 font-medium">Loading ATM data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 border-b border-blue-800/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-blue-400" />
                <h1 className="text-4xl font-bold text-white">ATM Monitoring</h1>
              </div>
              <p className="mt-2 text-blue-200">
                Real-time monitoring of ATM balances and hardware status
              </p>
            </div>
            <div className="mt-6 sm:mt-0 flex items-center gap-3 bg-blue-800/40 backdrop-blur-sm px-4 py-3 rounded-lg border border-blue-700/50">
              <Clock className="w-5 h-5 text-blue-300" />
              <span className="text-sm font-medium text-blue-200 hidden xs:inline">Refresh:</span>
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                {[10, 60, 300, 600].map((interval) => (
                  <button
                    key={interval}
                    onClick={() => setRefreshInterval(interval as 10 | 60 | 300 | 600)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                      refreshInterval === interval
                        ? 'bg-blue-400 text-slate-900 shadow-lg shadow-blue-400/50'
                        : 'bg-blue-700/40 text-blue-200 hover:bg-blue-600/60'
                    }`}
                  >
                    {interval === 10 ? '10s' : interval === 60 ? '1m' : interval === 300 ? '5m' : '10m'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-slate-100 hover:border-blue-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-300" />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total ATMs</p>
                  <p className="text-4xl font-bold text-slate-900 mt-2">{stats.total}</p>
                </div>
                <Activity className="w-12 h-12 text-blue-400 opacity-80" />
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-slate-100 hover:border-red-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-300" />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Critical</p>
                  <p className="text-4xl font-bold text-red-600 mt-2">{stats.critical}</p>
                </div>
                <AlertTriangle className="w-12 h-12 text-red-400 opacity-80" />
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-slate-100 hover:border-amber-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-300" />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Low Balance</p>
                  <p className="text-4xl font-bold text-amber-600 mt-2">{stats.low}</p>
                </div>
                <AlertTriangle className="w-12 h-12 text-amber-400 opacity-80" />
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-slate-100 hover:border-emerald-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-300" />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Healthy</p>
                  <p className="text-4xl font-bold text-emerald-600 mt-2">
                    {stats.total - stats.critical - stats.low}
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-emerald-400 opacity-80" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Balance Distribution</h3>
              </div>
              {dataChanges.balanceChange && (
                <div className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                  vs previous
                </div>
              )}
            </div>
            {balanceChartData.length > 0 ? (
              <div key={`balance-${chartRefresh}`} className="chart-refresh">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={balanceChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ value }) => `${value}`}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {balanceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} ATMs`} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-slate-500">No balance data available</div>
            )}
            {dataChanges.balanceChange && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Critical</span>
                  <TrendIndicator change={dataChanges.balanceChange.critical} isPositive={false} />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Low</span>
                  <TrendIndicator change={dataChanges.balanceChange.low} isPositive={false} />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Healthy</span>
                  <TrendIndicator change={dataChanges.balanceChange.healthy} isPositive={true} />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">Hardware Status</h3>
              </div>
              {dataChanges.hardwareChange && (
                <div className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                  vs previous
                </div>
              )}
            </div>
            {hardwareChartData.length > 0 ? (
              <div key={`hardware-${chartRefresh}`} className="chart-refresh">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={hardwareChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ value }) => `${value}`}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {hardwareChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} ATMs`} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-slate-500">No hardware data available</div>
            )}
            {dataChanges.hardwareChange && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Healthy</span>
                  <TrendIndicator change={dataChanges.hardwareChange.healthy} isPositive={true} />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Errors</span>
                  <TrendIndicator change={dataChanges.hardwareChange.errors} isPositive={false} />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Warnings</span>
                  <TrendIndicator change={dataChanges.hardwareChange.warnings} isPositive={false} />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-bold text-slate-900">Critical Errors</h3>
            </div>
            {errorTypeChartData.length > 0 ? (
              <div key={`error-types-${chartRefresh}`} className="chart-refresh">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={errorTypeChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ value }) => `${value}`}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {errorTypeChartData.map((entry, index) => (
                        <Cell key={`error-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} errors`} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-slate-500">No errors detected</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-slate-100">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by ATM name, ID, terminal, or branch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 focus:bg-white transition-all duration-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'critical', 'low'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-200 capitalize ${
                    filterStatus === status
                      ? status === 'all'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                        : status === 'critical'
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/40'
                          : 'bg-amber-600 text-white shadow-lg shadow-amber-600/40'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">ATM Balance Overview</h2>
            {filterStatus === 'all' && (
              <button
                onClick={() => setShowHealthyBalance(!showHealthyBalance)}
                className="p-2 rounded-lg hover:bg-slate-200 transition-colors duration-200 text-slate-600 hover:text-slate-900"
                title={showHealthyBalance ? 'Hide healthy' : 'Show healthy'}
              >
                {showHealthyBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBalances.map((balance) => (
              <AtmBalanceCard
                key={balance.record_id}
                balance={balance}
                onClick={() => setSelectedAtm(balance)}
              />
            ))}
          </div>
          {filteredBalances.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-lg">No ATMs match your search criteria</p>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Hardware Status</h2>
          <p className="text-sm text-slate-600 mb-6">Click any column header to filter by that component</p>
          <AtmStatusTable searchTerm={searchTerm} statuses={statuses} hardwareFilter={hardwareFilter} onFilterChange={setHardwareFilter} />
        </div>
      </main>

      {selectedAtm && (
        <AtmDetailsModal
          balance={selectedAtm}
          status={statuses.find((s) => s.atm_pid === selectedAtm.terminal_id) || null}
          onClose={() => setSelectedAtm(null)}
        />
      )}
    </div>
  );
}
