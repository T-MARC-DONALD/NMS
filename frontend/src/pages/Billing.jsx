import React, { useEffect, useState } from 'react';
import { statsAPI } from '../api';

export default function Billing() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setLoading(true);
        const res = await statsAPI.getReports(7);
        setReport(res.data.data);
      } catch (err) {
        setError('Failed to load reporting data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [dateRange]);

  if (loading) {
    return <div className="text-center py-12 text-slate-200">Loading reporting data...</div>;
  }

  if (error) {
    return <div className="bg-red-100 text-red-800 p-4 rounded">{error}</div>;
  }

  const series = report?.series || [];
  const summary = report?.summary || {};
  const totalTraffic = summary.traffic_total_mb || 0;
  const estimatedCost = (totalTraffic * 0.1).toFixed(2);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-slate-950">Reporting and SLA</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Historical uptime, traffic, and incident trends help cover the PRD requirement for reporting, capacity planning, and SLA visibility.
        </p>
      </div>

      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Report Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium">Average Uptime</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{summary.average_uptime || 0}%</p>
        </div>
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium">Traffic Total</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalTraffic.toFixed(2)} MB</p>
        </div>
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium">Estimated Cost</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">${estimatedCost}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium">Open Alerts</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{summary.open_alerts || 0}</p>
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Trend Report</h3>
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">7-day snapshot</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold">Date</th>
                <th className="text-right py-3 px-4 font-semibold">Devices Up</th>
                <th className="text-right py-3 px-4 font-semibold">Alerts</th>
                <th className="text-right py-3 px-4 font-semibold">Traffic (MB)</th>
                <th className="text-right py-3 px-4 font-semibold">Uptime %</th>
              </tr>
            </thead>
            <tbody>
              {series.map((entry) => (
                <tr key={entry.date} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono">{entry.date}</td>
                  <td className="py-3 px-4 text-right">{entry.devices_up}</td>
                  <td className="py-3 px-4 text-right">{entry.alerts}</td>
                  <td className="py-3 px-4 text-right">{entry.traffic_mb}</td>
                  <td className="py-3 px-4 text-right font-semibold">{entry.uptime_percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-2">Service Level Agreement (SLA)</h4>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Uptime, alerts, and traffic trends are reported from live monitoring data</li>
          <li>• Traffic figures can be used for chargeback or capacity planning workflows</li>
          <li>• Historical windows support executive review and incident analysis</li>
          <li>• The reporting layer is structured to expand into exports and scheduled reports later</li>
        </ul>
      </div>
    </div>
  );
}
