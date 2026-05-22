import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deviceAPI } from '../api';

export default function DeviceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchDevice = async () => {
      try {
        setLoading(true);
        const res = await deviceAPI.getById(id);
        setDevice(res.data.data);
        setFormData(res.data.data);
      } catch (err) {
        setError('Failed to load device details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDevice();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        hostname: formData.hostname,
        device_type: formData.device_type,
        location: formData.location,
        snmp_community: formData.snmp_community,
        snmp_version: formData.snmp_version,
        port: Number(formData.port) || 161,
        enabled: Boolean(formData.enabled),
      };
      await deviceAPI.update(id, payload);
      setDevice({ ...device, ...payload });
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update device');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-200">Loading device details...</div>;
  }

  if (error || !device) {
    return <div className="bg-red-100 text-red-800 p-4 rounded">{error || 'Device not found'}</div>;
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/devices')} className="text-sm font-medium text-cyan-700 hover:underline">
        ← Back to Devices
      </button>

      <div className="card">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-950">{device.hostname || device.ip_address}</h2>
            <p className="mt-2 text-sm text-slate-500">{device.ip_address} · {device.device_type} · {device.location || 'No location set'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(!isEditing)} className="btn btn-secondary">
              {isEditing ? 'Cancel' : 'Edit Device'}
            </button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Hostname</label>
                <input
                  type="text"
                  value={formData.hostname || ''}
                  onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Device Type</label>
                <select
                  value={formData.device_type || ''}
                  onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="router">Router</option>
                  <option value="switch">Switch</option>
                  <option value="server">Server</option>
                  <option value="firewall">Firewall</option>
                  <option value="printer">Printer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">SNMP Community</label>
                <input
                  type="text"
                  value={formData.snmp_community || ''}
                  onChange={(e) => setFormData({ ...formData, snmp_community: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">SNMP Version</label>
                <select
                  value={formData.snmp_version || '2c'}
                  onChange={(e) => setFormData({ ...formData, snmp_version: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="1">SNMP v1</option>
                  <option value="2c">SNMP v2c</option>
                  <option value="3">SNMP v3</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Port</label>
                <input
                  type="number"
                  value={formData.port || 161}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Enabled</label>
                <select
                  value={formData.enabled ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.value === 'true' })}
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </form>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</div>
              <div className={`mt-2 text-lg font-bold status-${device.status}`}>{device.status}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Device type</div>
              <div className="mt-2 text-lg font-bold text-slate-950 capitalize">{device.device_type}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Location</div>
              <div className="mt-2 text-lg font-bold text-slate-950">{device.location || 'Not set'}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">SNMP</div>
              <div className="mt-2 text-lg font-bold text-slate-950">v{device.snmp_version || '2c'} / {device.port || 161}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Enabled</div>
              <div className="mt-2 text-lg font-bold text-slate-950">{device.enabled ? 'Yes' : 'No'}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Last seen</div>
              <div className="mt-2 text-lg font-bold text-slate-950">{device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-950">Sensor coverage</h3>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{device.sensors?.length || 0} sensors</span>
          </div>
          {device.sensors && device.sensors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-3 pr-3">Sensor</th>
                    <th className="py-3 pr-3">Protocol</th>
                    <th className="py-3 pr-3">Status</th>
                    <th className="py-3 pr-3">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {device.sensors.map((sensor) => (
                    <tr key={sensor.id} className="border-b border-slate-100">
                      <td className="py-3 pr-3 font-medium text-slate-900">{sensor.name}</td>
                      <td className="py-3 pr-3 text-slate-600">{sensor.protocol}</td>
                      <td className="py-3 pr-3">
                        <span className={`severity-${sensor.status === 'down' ? 'critical' : sensor.status === 'warning' ? 'warning' : 'info'}`}>{sensor.status}</span>
                      </td>
                      <td className="py-3 pr-3 text-slate-600">{sensor.value}{sensor.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">No sensors have been generated for this device yet.</div>
          )}
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-950">Interfaces</h3>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{device.interfaces?.length || 0} interfaces</span>
          </div>
          {device.interfaces && device.interfaces.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-3 pr-3">Name</th>
                    <th className="py-3 pr-3">Status</th>
                    <th className="py-3 pr-3">MAC</th>
                    <th className="py-3 pr-3">Speed</th>
                  </tr>
                </thead>
                <tbody>
                  {device.interfaces.map((iface) => (
                    <tr key={iface.id} className="border-b border-slate-100">
                      <td className="py-3 pr-3 font-mono text-slate-900">{iface.interface_name}</td>
                      <td className="py-3 pr-3">
                        <span className={`status-${iface.status}`}>{iface.status}</span>
                      </td>
                      <td className="py-3 pr-3 font-mono text-slate-600">{iface.mac_address || '-'}</td>
                      <td className="py-3 pr-3 text-slate-600">{iface.speed || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">No interface inventory returned from SNMP.</div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-950">Recent alerts and transitions</h3>
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Latest events</span>
        </div>
        {device.recent_events && device.recent_events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-3 pr-3">Time</th>
                  <th className="py-3 pr-3">Type</th>
                  <th className="py-3 pr-3">Severity</th>
                  <th className="py-3 pr-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {device.recent_events.map((event) => (
                  <tr key={event.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3 text-xs text-slate-500">{new Date(event.created_at).toLocaleString()}</td>
                    <td className="py-3 pr-3 text-slate-700">{event.event_type}</td>
                    <td className="py-3 pr-3"><span className={`severity-${event.severity}`}>{event.severity}</span></td>
                    <td className="py-3 pr-3 text-slate-700">{event.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">No recent events for this device.</div>
        )}
      </div>
    </div>
  );
}
