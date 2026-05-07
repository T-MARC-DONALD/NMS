import React, { useState, useEffect } from 'react';
import { statsAPI, eventAPI } from '../api';
import { Pie, Bar } from 'react-chartjs-2';
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

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [eventsBySeverity, setEventsBySeverity] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [summaryRes, severityRes, eventsRes] = await Promise.all([
          statsAPI.getSummary(),
          statsAPI.getEventsBySeverity(),
          eventAPI.getAll(1, 10, { resolved: false })
        ]);

        setSummary(summaryRes.data.data);
        setEventsBySeverity(severityRes.data.data);
        setRecentEvents(eventsRes.data.data);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="bg-red-100 text-red-800 p-4 rounded">{error}</div>;
  }

  const severityChartData = {
    labels: Object.keys(eventsBySeverity || {}),
    datasets: [{
      label: 'Events by Severity',
      data: Object.values(eventsBySeverity || {}),
      backgroundColor: ['#ef4444', '#eab308', '#3b82f6'],
    }]
  };

  const deviceStatusData = {
    labels: ['Up', 'Down'],
    datasets: [{
      label: 'Device Status',
      data: [summary?.devices_up || 0, summary?.devices_down || 0],
      backgroundColor: ['#10b981', '#ef4444'],
    }]
  };

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium">Total Devices</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.total_devices || 0}</p>
        </div>
        
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium">Devices Up</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{summary?.devices_up || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{summary?.uptime_percentage?.toFixed(1) || 0}% uptime</p>
        </div>
        
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium">Critical Events</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">{summary?.critical_events || 0}</p>
        </div>
        
        <div className="card">
          <h3 className="text-gray-600 text-sm font-medium">Unresolved Events</h3>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{summary?.unresolved_events || 0}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Events by Severity</h3>
          {eventsBySeverity && Object.keys(eventsBySeverity).length > 0 ? (
            <Pie data={severityChartData} />
          ) : (
            <p className="text-gray-500 text-center py-8">No event data</p>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Device Status</h3>
          <Bar data={deviceStatusData} />
        </div>
      </div>

      {/* Recent Events */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Recent Unresolved Events</h3>
        {recentEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Device</th>
                  <th className="text-left py-3 px-4 font-semibold">Type</th>
                  <th className="text-left py-3 px-4 font-semibold">Severity</th>
                  <th className="text-left py-3 px-4 font-semibold">Message</th>
                  <th className="text-left py-3 px-4 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map(event => (
                  <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{event.device_hostname || event.device_ip}</td>
                    <td className="py-3 px-4">{event.event_type}</td>
                    <td className="py-3 px-4">
                      <span className={`severity-${event.severity}`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">{event.message}</td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No unresolved events</p>
        )}
      </div>
    </div>
  );
}
