import { useState } from 'react';
import { AtmStatus } from '../lib/api';
import { CheckCircle, XCircle, AlertCircle, ChevronDown, Eye, EyeOff, Settings2 } from 'lucide-react';
import { decodeDeviceStatus, getStatusColor } from '../lib/hardwareStatusDecoder';

interface AtmStatusTableProps {
  statuses: AtmStatus[];
  hardwareFilter?: string;
  onFilterChange?: (filter: string) => void;
  searchTerm?: string;
}

export function AtmStatusTable({ statuses, hardwareFilter = 'all', onFilterChange, searchTerm = '' }: AtmStatusTableProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasError = (status: string | null | undefined): boolean => {
    if (!status) return false;
    const decoded = decodeDeviceStatus(status);
    if (!decoded || !decoded.isConfigured) return false;
    return decoded.status !== 'OK';
  };

  const atmHasIssues = (atmStatus: AtmStatus): boolean => {
    const components = [atmStatus.status, atmStatus.net, atmStatus.crd_reader, atmStatus.dispenser, atmStatus.encryptor, atmStatus.depository];
    return components.some(c => hasError(c));
  };

  const columnHeaders = [
    { key: 'status', label: 'Status' },
    { key: 'net', label: 'Network' },
    { key: 'crd_reader', label: 'Card Reader' },
    { key: 'dispenser', label: 'Dispenser' },
    { key: 'print_user', label: 'Printer' },
    { key: 'door', label: 'Door' },
    { key: 'encryptor', label: 'Encryptor' },
    { key: 'card_bin', label: 'Card Bin' },
    { key: 'rej_bin', label: 'Reject Bin' },
    { key: 'depository', label: 'Depository' },
  ];

  const getStatusField = (atmStatus: AtmStatus, key: string): string | null => {
    const map: Record<string, string | null> = {
      status: atmStatus.status,
      net: atmStatus.net,
      crd_reader: atmStatus.crd_reader,
      dispenser: atmStatus.dispenser,
      print_user: atmStatus.print_user,
      door: atmStatus.door,
      encryptor: atmStatus.encryptor,
      card_bin: atmStatus.card_bin,
      rej_bin: atmStatus.rej_bin,
      depository: atmStatus.depository,
    };
    return map[key] ?? null;
  };

  const columnHasIssues = (columnKey: string): boolean => {
    return statuses.some(status => hasError(getStatusField(status, columnKey)));
  };

  const getVisibleColumns = () => {
    if (showAdvanced) return columnHeaders;
    return columnHeaders.filter(col => columnHasIssues(col.key));
  };

  const getFilteredStatuses = () => {
    let filtered = statuses;

    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter((status) => {
      const matchesSearch =
        status.atm_pid?.toLowerCase().includes(searchLower) ||
        status.branch?.toLowerCase().includes(searchLower);
      return matchesSearch;
    });

    if (!showAdvanced) {
      filtered = filtered.filter(status => atmHasIssues(status));
    }

    if (hardwareFilter === 'all') return filtered;

    return filtered.filter((status) => hasError(getStatusField(status, hardwareFilter)));
  };

  const getStatusIcon = (status: string | null) => {
    if (!status) return <AlertCircle className="w-5 h-5 text-gray-400" />;

    const decoded = decodeDeviceStatus(status);
    if (!decoded) return <AlertCircle className="w-5 h-5 text-gray-400" />;

    switch (decoded.status) {
      case 'OK':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'Warning':
      case 'Suspended':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'Critical':
      case 'Disabled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'Not Configured':
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string | null, label?: string) => {
    if (!status) return null;

    const decoded = decodeDeviceStatus(status);
    if (!decoded) return null;

    const bgColor = getStatusColor(decoded.status);
    let icon = null;

    switch (decoded.status) {
      case 'OK':
        icon = <CheckCircle className="w-3 h-3" />;
        break;
      case 'Warning':
        icon = <AlertCircle className="w-3 h-3" />;
        break;
      case 'Critical':
      case 'Disabled':
        icon = <XCircle className="w-3 h-3" />;
        break;
      case 'Not Configured':
        icon = <AlertCircle className="w-3 h-3 opacity-50" />;
        break;
    }

    const displayText = label || decoded.status;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${bgColor}`}
        title={`${decoded.device}: ${decoded.status} - ${decoded.supply} (${decoded.additional})`}
      >
        {icon}
        {displayText}
      </span>
    );
  };

  const visibleColumns = getVisibleColumns();

  const handleColumnClick = (fieldKey: string) => {
    if (onFilterChange) {
      if (hardwareFilter === fieldKey) {
        onFilterChange('all');
      } else {
        onFilterChange(fieldKey);
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-100">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white rounded-lg transition-all duration-200 border border-slate-200 hover:border-slate-300 hover:shadow-sm"
        >
          {showAdvanced ? (
            <>
              <Eye className="w-4 h-4 text-slate-600" />
              Hide Advanced
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4 text-slate-600" />
              Show Advanced
            </>
          )}
        </button>
        <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
          <Settings2 className="w-3.5 h-3.5" />
          Click headers to filter
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-blue-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-widest">
                ATM
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-widest">
                Branch
              </th>
              {visibleColumns.map((header) => (
                <th
                  key={header.key}
                  onClick={() => handleColumnClick(header.key)}
                  className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-widest cursor-pointer hover:bg-blue-100 transition-colors relative group"
                >
                  <div className="flex items-center gap-2">
                    {header.label}
                    <ChevronDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {hardwareFilter === header.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t"></div>
                  )}
                </th>
              ))}
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-widest">
                Updated
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {getFilteredStatuses().map((status) => (
              <tr key={status.record_id} className="hover:bg-blue-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status.status)}
                    <div>
                      <div className="text-sm font-bold text-slate-900">{status.atm_pid}</div>
                      <div className="text-xs text-slate-500 font-medium">{status.owner}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                  {status.branch || '-'}
                </td>
                {visibleColumns.map((col) => (
                  <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(getStatusField(status, col.key))}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-600">
                  {status.file_date
                    ? new Date(status.file_date).toLocaleString()
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {getFilteredStatuses().length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">
            {statuses.length === 0 ? 'No ATM status data available' : 'No results for selected hardware type'}
          </p>
        </div>
      )}
    </div>
  );
}
