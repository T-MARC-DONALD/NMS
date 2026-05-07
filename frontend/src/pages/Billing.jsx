import React, { useState, useEffect } from 'react';
import { eventAPI } from '../api';

export default function Billing() {
  const [billingData, setBillingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setLoading(true);
        // In production, this would call a billing API
        // For now, we'll show traffic analysis from events
        const res = await eventAPI.getAll(1, 100);
        
        // Calculate mock billing data
        const ipTraffic = {};
        res.data.data.forEach(event => {
          const ip = event.device_ip || 'Unknown';
          if (!ipTraffic[ip]) {
            ipTraffic[ip] = { in: 0, out: 0, events: 0 };
          }
          ipTraffic[ip].events++;
          ipTraffic[ip].in += Math.random() * 100; // Mock traffic
          ipTraffic[ip].out += Math.random() * 100;
        });

        setBillingData(ipTraffic);
      } catch (err) {
        setError('Failed to load billing data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [dateRange]);

  const getTotalCost = () => {
    if (!billingData) return 0;
    let total = 0;
    Object.values(billingData).forEach(data => {
      const totalTraffic = (data.in + data.out) / 1024; // Convert to MB
      total += totalTraffic * 0.1; // $0.1 per MB
    });
    return total.toFixed(2);
  };

  if (loading) {
    return <div className="text-center py-12">Loading billing data...</div>;
  }

  if (error) {
    return <div className="bg-red-100 text-red-800 p-4 rounded">{error}</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Billing & SLA</h2>

      {/* Date Range */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Report Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium">Total Cost</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">${getTotalCost()}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium">IPs Billed</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{Object.keys(billingData || {}).length}</p>
        </div>
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium">Rate</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">$0.10/MB</p>
        </div>
      </div>

      {/* Usage Table */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Per-IP Traffic & Charges</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold">IP Address</th>
                <th className="text-right py-3 px-4 font-semibold">Incoming (MB)</th>
                <th className="text-right py-3 px-4 font-semibold">Outgoing (MB)</th>
                <th className="text-right py-3 px-4 font-semibold">Total (MB)</th>
                <th className="text-right py-3 px-4 font-semibold">Cost</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(billingData || {}).map(([ip, data]) => {
                const totalTraffic = (data.in + data.out) / 1024;
                const cost = (totalTraffic * 0.1).toFixed(2);
                return (
                  <tr key={ip} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono">{ip}</td>
                    <td className="py-3 px-4 text-right">{(data.in / 1024).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">{(data.out / 1024).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-semibold">{totalTraffic.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">${cost}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SLA Info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-2">Service Level Agreement (SLA)</h4>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• <strong>Uptime SLA:</strong> 99.5% (max 3.6 hours downtime per month)</li>
          <li>• <strong>Response Time:</strong> Average &lt;100ms for API calls</li>
          <li>• <strong>Billing Model:</strong> $0.10 per MB of traffic</li>
          <li>• <strong>Data Retention:</strong> 30 days of event history</li>
          <li>• <strong>Support:</strong> Business hours email support</li>
        </ul>
      </div>
    </div>
  );
}
