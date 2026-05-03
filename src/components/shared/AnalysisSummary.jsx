import React from 'react';
import { Info, Hash, Type, Fingerprint } from 'lucide-react';
import { formatKpiGrouped } from '../../utils/formatNumber';

const AnalysisSummary = ({ analysis }) => {
  if (!analysis) return null;

  return (
    <div className="mt-12 space-y-8">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Column Analysis</h3>
        <p className="text-muted text-sm">Detailed insights detected for each column in your dataset.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(analysis).map(([columnName, stats]) => (
          <div key={columnName} className="bg-surface border border-border rounded-xl p-5 hover:border-accent/40 transition-colors">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
              <div className="flex items-center gap-2 overflow-hidden">
                {stats.isNumeric ? <Hash size={16} className="text-accent" /> : <Type size={16} className="text-muted" />}
                <h4 className="font-bold text-white truncate" title={columnName}>{columnName}</h4>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-white/5 rounded-md border border-white/10 text-muted">
                {stats.isNumeric ? 'Number' : 'String'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted tracking-wide">Unique Values</p>
                <p className="text-lg font-bold text-white">{stats.uniqueCount.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted tracking-wide">Missing Values</p>
                <p className={`text-lg font-bold ${stats.emptyCount > 0 ? 'text-danger' : 'text-success'}`}>
                  {stats.emptyCount.toLocaleString()}
                </p>
              </div>
            </div>

            {stats.isNumeric && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-[10px] uppercase font-bold text-muted tracking-tight mb-3">Numeric Stats</p>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-muted/60">Average</p>
                    <p className="text-sm font-bold text-accent">{formatKpiGrouped(stats.avg)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-muted/60">Total Sum</p>
                    <p className="text-sm font-bold text-white">{formatKpiGrouped(stats.sum)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-muted/60">Minimum</p>
                    <p className="text-sm font-bold text-white">{formatKpiGrouped(stats.min)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-muted/60">Maximum</p>
                    <p className="text-sm font-bold text-white">{formatKpiGrouped(stats.max)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalysisSummary;
