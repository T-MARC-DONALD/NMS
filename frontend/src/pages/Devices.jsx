import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deviceAPI } from '../api';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [appliedStatusFilter, setAppliedStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    ip_address: '',
    hostname: '',
    device_type: 'router',
    location: '',
    snmp_community: 'public',
    snmp_version: '2c',
    port: 161
  });
  const navigate = useNavigate();

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await deviceAPI.getAll(page, 10, appliedStatusFilter || null, appliedQuery);
      setDevices(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      setError('Failed to load devices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [page, appliedQuery, appliedStatusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedQuery(query);
    setAppliedStatusFilter(statusFilter);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await deviceAPI.create(formData);
      setFormData({
        ip_address: '',
        hostname: '',
        device_type: 'router',
        location: '',
        snmp_community: 'public',
        snmp_version: '2c',
        port: 161
      });
      setShowForm(false);
      setPage(1);
      fetchDevices();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add device');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this device?')) {
      try {
        await deviceAPI.delete(id);
        fetchDevices();
      } catch (err) {
        setError('Failed to delete device');
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Network Devices</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : '+ Add Device'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-4">{error}</div>
      )}

      <form onSubmit={handleSearch} className="card mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px_auto]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by IP, hostname, type, or location"
            className="border rounded px-3 py-2"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All statuses</option>
            <option value="up">Up</option>
            <option value="down">Down</option>
            <option value="unknown">Unknown</option>
          </select>
          <button type="submit" className="btn btn-secondary">Search</button>
        </div>
      </form>

      {showForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">Add New Device</h3>
          <p className="text-sm text-gray-600 mb-4">
            The system pings the target first and stores one device at a time.
            SNMP supports v1, v2c, and v3 in the form so the inventory matches the PRD.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="IP Address or Hostname"
                value={formData.ip_address}
                onChange={(e) => setFormData({...formData, ip_address: e.target.value})}
                className="border rounded px-3 py-2"
                required
              />
              <input
                type="text"
                placeholder="Hostname"
                value={formData.hostname}
                onChange={(e) => setFormData({...formData, hostname: e.target.value})}
                className="border rounded px-3 py-2"
              />
              <select
                value={formData.device_type}
                onChange={(e) => setFormData({...formData, device_type: e.target.value})}
                className="border rounded px-3 py-2"
              >
                <option value="router">Router</option>
                <option value="switch">Switch</option>
                <option value="server">Server</option>
                <option value="firewall">Firewall</option>
                <option value="printer">Printer</option>
                <option value="other">Other</option>
              </select>
              <input
                type="text"
                placeholder="Location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="border rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="SNMP Community"
                value={formData.snmp_community}
                onChange={(e) => setFormData({...formData, snmp_community: e.target.value})}
                className="border rounded px-3 py-2"
              />
              <select
                value={formData.snmp_version}
                onChange={(e) => setFormData({...formData, snmp_version: e.target.value})}
                className="border rounded px-3 py-2"
              >
                <option value="2c">SNMP v2c</option>
                <option value="1">SNMP v1</option>
                <option value="3">SNMP v3</option>
              </select>
              <input
                type="number"
                placeholder="SNMP Port"
                value={formData.port}
                onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                className="border rounded px-3 py-2"
              />
            </div>
            <button type="submit" className="btn btn-primary mt-4">Add Device</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">Loading devices...</div>
      ) : (
        <div className="card">
          {devices.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold">IP Address</th>
                      <th className="text-left py-3 px-4 font-semibold">Hostname</th>
                      <th className="text-left py-3 px-4 font-semibold">Type</th>
                      <th className="text-left py-3 px-4 font-semibold">Location</th>
                      <th className="text-left py-3 px-4 font-semibold">SNMP</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map(device => (
                      <tr key={device.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono">{device.ip_address}</td>
                        <td className="py-3 px-4">{device.hostname || '-'}</td>
                        <td className="py-3 px-4 capitalize">{device.device_type}</td>
                        <td className="py-3 px-4">{device.location || '-'}</td>
                        <td className="py-3 px-4 uppercase text-xs text-gray-600">v{device.snmp_version || '2c'}:{device.port || 161}</td>
                        <td className="py-3 px-4">
                          <span className={`status-${device.status}`}>
                            {device.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => navigate(`/devices/${device.id}`)}
                            className="btn btn-secondary btn-small mr-2"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDelete(device.id)}
                            className="btn btn-danger btn-small"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <span>Page {page}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * 10 >= total}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">No devices found</p>
          )}
        </div>
      )}
    </div>
  );
}
