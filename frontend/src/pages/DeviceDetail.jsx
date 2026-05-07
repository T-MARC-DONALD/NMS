import React, { useState, useEffect } from 'react';
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
      await deviceAPI.update(id, formData);
      setDevice(formData);
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update device');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading device details...</div>;
  }

  if (error || !device) {
    return <div className="bg-red-100 text-red-800 p-4 rounded">{error || 'Device not found'}</div>;
  }

  return (
    <div>
      <button onClick={() => navigate('/devices')} className="mb-4 text-blue-600 hover:underline">
        ← Back to Devices
      </button>

      <div className="card mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold">{device.hostname || device.ip_address}</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn btn-secondary"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleUpdate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Hostname</label>
                <input
                  type="text"
                  value={formData.hostname || ''}
                  onChange={(e) => setFormData({...formData, hostname: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Device Type</label>
                <select
                  value={formData.device_type || ''}
                  onChange={(e) => setFormData({...formData, device_type: e.target.value})}
                  className="w-full border rounded px-3 py-2"
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
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SNMP Community</label>
                <input
                  type="text"
                  value={formData.snmp_community || ''}
                  onChange={(e) => setFormData({...formData, snmp_community: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary mt-4">Save Changes</button>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-600 text-sm">IP Address</p>
              <p className="font-mono">{device.ip_address}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Status</p>
              <p className={`status-${device.status} capitalize`}>{device.status}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Device Type</p>
              <p className="capitalize">{device.device_type}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Location</p>
              <p>{device.location || '-'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">SNMP Community</p>
              <p>{device.snmp_community}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Last Seen</p>
              <p>{device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Interfaces */}
      {device.interfaces && device.interfaces.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">Interfaces</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Type</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">MAC Address</th>
                  <th className="text-left py-3 px-4 font-semibold">Speed</th>
                </tr>
              </thead>
              <tbody>
                {device.interfaces.map(iface => (
                  <tr key={iface.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-mono">{iface.interface_name}</td>
                    <td className="py-3 px-4">{iface.interface_type}</td>
                    <td className="py-3 px-4">
                      <span className={`status-${iface.status}`}>
                        {iface.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">{iface.mac_address}</td>
                    <td className="py-3 px-4">{iface.speed || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Events */}
      {device.recent_events && device.recent_events.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Events</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Time</th>
                  <th className="text-left py-3 px-4 font-semibold">Type</th>
                  <th className="text-left py-3 px-4 font-semibold">Severity</th>
                  <th className="text-left py-3 px-4 font-semibold">Message</th>
                </tr>
              </thead>
              <tbody>
                {device.recent_events.map(event => (
                  <tr key={event.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">{event.event_type}</td>
                    <td className="py-3 px-4">
                      <span className={`severity-${event.severity}`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">{event.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
