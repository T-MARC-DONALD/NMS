import React, { useEffect, useState } from 'react';
import { statsAPI } from '../api';
import { Pie, Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const formatList = (items, fallback = 'None') => (items && items.length ? items.join(' · ') : fallback);

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [severityData, setSeverityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const [overviewRes, severityRes] = await Promise.all([
          statsAPI.getOverview(),
          statsAPI.getEventsBySeverity(),
        ]);

        if (!active) {
          return;
        }

        setOverview(overviewRes.data.data);
        setSeverityData(severityRes.data.data);
        setError(null);
      } catch (err) {
        if (!active) {
          return;
        }
        setError('Failed to load monitoring overview');
        console.error(err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 20000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return <div className="text-center py-16 text-slate-200">Loading monitoring console...</div>;
  }

  if (error) {
    return <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl">{error}</div>;
  }

  const summary = overview?.summary || {};
  const catalog = overview?.catalog || {};
  const topology = overview?.topology || { nodes: [], links: [] };
  const sensors = overview?.sensors || [];
  const alerts = overview?.alerts || [];
  const reports = overview?.reports || [];

  const deviceStatusData = {
    labels: ['Up', 'Down'],
    datasets: [
      {
        label: 'Devices',
        data: [summary.devices_up || 0, summary.devices_down || 0],
        backgroundColor: ['#0f766e', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

  const severityChartData = {
    labels: Object.keys(severityData || {}),
    datasets: [
      {
        label: 'Events',
        data: Object.values(severityData || {}),
        backgroundColor: ['#ef4444', '#f59e0b', '#2563eb'],
        borderWidth: 0,
      },
    ],
  };

  const reportChartData = {
    labels: reports.map((entry) => entry.date),
    datasets: [
      {
        label: 'Uptime %',
        data: reports.map((entry) => entry.uptime_percentage),
        borderColor: '#0f766e',
        backgroundColor: 'rgba(15, 118, 110, 0.12)',
        tension: 0.35,
        fill: true,
      },
      {
        label: 'Traffic MB',
        data: reports.map((entry) => entry.traffic_mb),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        tension: 0.35,
      },
    ],
  };

  const protocolGroups = catalog.protocols || [];
  const areaGroups = catalog.monitored_areas || [];
  const automationActions = catalog.automation_actions || [];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl">
        <div className="grid gap-8 p-8 lg:grid-cols-[1.5fr_1fr] lg:p-10">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
              PRTG-style monitoring console
            </div>
            <div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white md:text-6xl">
                Central visibility for devices, sensors, alerts, and service health.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                This console tracks real devices, interface inventory, auto-discovery probes, sensor groups,
                and operational reports so the product behaves like a real monitoring platform rather than a static dashboard.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Devices</div>
                <div className="mt-2 text-2xl font-bold">{summary.total_devices || 0}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Sensors</div>
                <div className="mt-2 text-2xl font-bold">{summary.sensor_count || sensors.length || 0}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Uptime</div>
                <div className="mt-2 text-2xl font-bold">{(summary.uptime_percentage || 0).toFixed(1)}%</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Alerts</div>
                <div className="mt-2 text-2xl font-bold">{summary.alert_count ?? summary.unresolved_events ?? alerts.length}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Platform status</div>
                <div className="mt-1 text-lg font-semibold text-white">Live monitoring ready</div>
              </div>
              <div className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-slate-950">Connected</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
              <div className="rounded-2xl bg-slate-900/70 p-4">
                <div className="text-slate-400">Protocols</div>
                <div className="mt-2 font-semibold">{protocolGroups.length}</div>
              </div>
              <div className="rounded-2xl bg-slate-900/70 p-4">
                <div className="text-slate-400">Areas</div>
                <div className="mt-2 font-semibold">{areaGroups.length}</div>
              </div>
              <div className="rounded-2xl bg-slate-900/70 p-4">
                <div className="text-slate-400">Topology nodes</div>
                <div className="mt-2 font-semibold">{topology.nodes.length}</div>
              </div>
              <div className="rounded-2xl bg-slate-900/70 p-4">
                <div className="text-slate-400">Open incidents</div>
                <div className="mt-2 font-semibold">{alerts.length}</div>
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-amber-500/15 p-4 text-sm text-slate-200">
              <div className="font-semibold text-white">Supported monitoring surface</div>
              <div className="mt-2 leading-6">
                {formatList(protocolGroups)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card bg-white/95">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Devices up</div>
          <div className="mt-2 text-4xl font-black text-slate-950">{summary.devices_up || 0}</div>
          <div className="mt-2 text-sm text-slate-500">Of {summary.total_devices || 0} monitored nodes</div>
        </div>
        <div className="card bg-white/95">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Device down</div>
          <div className="mt-2 text-4xl font-black text-rose-600">{summary.devices_down || 0}</div>
          <div className="mt-2 text-sm text-slate-500">Devices currently offline</div>
        </div>
        <div className="card bg-white/95">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Interfaces</div>
          <div className="mt-2 text-4xl font-black text-slate-950">{summary.interface_count || 0}</div>
          <div className="mt-2 text-sm text-slate-500">Detected through inventory and SNMP</div>
        </div>
        <div className="card bg-white/95">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Critical alerts</div>
          <div className="mt-2 text-4xl font-black text-amber-600">{summary.critical_events || 0}</div>
          <div className="mt-2 text-sm text-slate-500">Requires operator attention</div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Device status distribution</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">ICMP / SNMP</span>
          </div>
          <div className="h-72">
            <Pie data={deviceStatusData} />
          </div>
        </div>
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Events by severity</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Alert engine</span>
          </div>
          <div className="h-72">
            <Pie data={severityChartData} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Trend reports</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Uptime and traffic</span>
          </div>
          <div className="h-80">
            <Line data={reportChartData} />
          </div>
        </div>
        <div className="card space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Monitoring catalog</h2>
            <p className="mt-1 text-sm text-slate-500">Built-in areas, alert channels, and automation paths.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Monitored areas</div>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {areaGroups.map((item) => (
                <span key={item} className="rounded-full bg-slate-900 px-3 py-1 text-white">{item}</span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Automation</div>
            <div className="mt-2 space-y-2 text-sm text-slate-700">
              {automationActions.map((item) => (
                <div key={item} className="rounded-xl border border-slate-200 bg-white px-3 py-2">{item}</div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Security and cloud</div>
            <div className="mt-2 text-sm leading-6 text-slate-700">
              {formatList(catalog.security_features)}
              <br />
              {formatList(catalog.cloud_features)}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Sensor inventory</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{sensors.length} sensors</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-3 pr-3">Sensor</th>
                  <th className="py-3 pr-3">Device</th>
                  <th className="py-3 pr-3">Protocol</th>
                  <th className="py-3 pr-3">Status</th>
                  <th className="py-3 pr-3">Value</th>
                </tr>
              </thead>
              <tbody>
                {sensors.slice(0, 8).map((sensor) => (
                  <tr key={sensor.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3 font-medium text-slate-900">{sensor.name}</td>
                    <td className="py-3 pr-3 text-slate-600">{sensor.device_label}</td>
                    <td className="py-3 pr-3 text-slate-600">{sensor.protocol}</td>
                    <td className="py-3 pr-3">
                      <span className={`severity-${sensor.status === 'down' ? 'critical' : sensor.status === 'warning' ? 'warning' : 'info'}`}>
                        {sensor.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-slate-600">{sensor.value}{sensor.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Open alerts</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{alerts.length} active</span>
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 6).map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-slate-900">{alert.device_hostname || alert.device_ip}</div>
                  <span className={`severity-${alert.severity}`}>{alert.severity}</span>
                </div>
                <div className="mt-2 text-sm text-slate-600">{alert.message}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">{alert.event_type}</div>
              </div>
            ))}
            {alerts.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">No active alerts</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
