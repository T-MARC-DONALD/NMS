import React, { useState } from 'react';
import { deviceAPI } from '../api';

export default function Discovery() {
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState(null);
  const [formData, setFormData] = useState({
    target: '',
    hostname: '',
    device_type: 'router',
    location: '',
    snmp_community: 'public',
    snmp_version: '2c',
    port: 161
  });
  const [error, setError] = useState(null);

  const handleProbe = async (e) => {
    e.preventDefault();
    try {
      setProbing(true);
      setError(null);
      setProbeResult(null);

      const res = await deviceAPI.probe({
        ip_address: formData.target,
        snmp_community: formData.snmp_community,
        snmp_version: formData.snmp_version,
        port: formData.port
      });

      setProbeResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Probe failed: ' + err.message);
    } finally {
      setProbing(false);
    }
  };

  const handleAddDevice = async (device) => {
    try {
      await deviceAPI.create({
        ip_address: device.ip_address,
        device_type: device.device_type,
        snmp_community: formData.snmp_community,
        snmp_version: formData.snmp_version,
        hostname: formData.hostname,
        location: formData.location,
        port: formData.port
      });
      alert('Device added successfully');
    } catch (err) {
      if (err.response?.data?.error?.includes('already exists')) {
        alert('Device already exists');
      } else {
        alert('Failed to add device: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Add Device</h2>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-4">{error}</div>
      )}

      {/* Add Device Form */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Probe One Device</h3>
        <p className="text-sm text-gray-600 mb-4">
          PRTG-style workflow: enter a single host, test it with ping, then add it.
          Network ranges are intentionally not scanned here.
        </p>
        <form onSubmit={handleProbe}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">IP Address or Hostname</label>
              <input
                type="text"
                value={formData.target}
                onChange={(e) => setFormData({...formData, target: e.target.value})}
                placeholder="e.g., 192.168.1.10 or router1.local"
                className="w-full border rounded px-3 py-2"
                disabled={probing}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">SNMP Community</label>
              <input
                type="text"
                value={formData.snmp_community}
                onChange={(e) => setFormData({...formData, snmp_community: e.target.value})}
                placeholder="e.g., public"
                className="w-full border rounded px-3 py-2"
                disabled={probing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Hostname</label>
              <input
                type="text"
                value={formData.hostname}
                onChange={(e) => setFormData({...formData, hostname: e.target.value})}
                placeholder="Optional display name"
                className="w-full border rounded px-3 py-2"
                disabled={probing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Device Type</label>
              <select
                value={formData.device_type}
                onChange={(e) => setFormData({...formData, device_type: e.target.value})}
                className="w-full border rounded px-3 py-2"
                disabled={probing}
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
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Optional location"
                className="w-full border rounded px-3 py-2"
                disabled={probing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">SNMP Version</label>
              <select
                value={formData.snmp_version}
                onChange={(e) => setFormData({...formData, snmp_version: e.target.value})}
                className="w-full border rounded px-3 py-2"
                disabled={probing}
              >
                <option value="2c">SNMP v2c</option>
                <option value="1">SNMP v1</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">SNMP Port</label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                className="w-full border rounded px-3 py-2"
                disabled={probing}
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={probing}
            className="btn btn-primary mt-4"
          >
            {probing ? 'Probing...' : 'Test Device'}
          </button>
        </form>
      </div>

      {/* Probe Result */}
      {probeResult && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">
            Probe Result: {probeResult.target}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
            <div className="p-4 border rounded bg-gray-50">
              <p className="font-semibold">Reachability</p>
              <p className={probeResult.reachable ? 'text-green-700' : 'text-red-700'}>
                {probeResult.reachable ? 'Ping successful' : 'Ping failed'}
              </p>
            </div>
            <div className="p-4 border rounded bg-gray-50">
              <p className="font-semibold">SNMP</p>
              <p>{probeResult.snmp_mode}</p>
            </div>
            <div className="p-4 border rounded bg-gray-50">
              <p className="font-semibold">Suggested Hostname</p>
              <p>{probeResult.hostname || '-'}</p>
            </div>
            <div className="p-4 border rounded bg-gray-50">
              <p className="font-semibold">Status</p>
              <p className="capitalize">{probeResult.status}</p>
            </div>
          </div>

          <button
            onClick={() => handleAddDevice({
              ip_address: probeResult.target,
              device_type: formData.device_type
            })}
            className="btn btn-primary"
          >
            Add This Device
          </button>
        </div>
      )}

      {/* Info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-2">How Device Add Works</h4>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Probes one host at a time with ping before adding it</li>
          <li>• Defaults to SNMP v2c so the workflow matches common PRTG setups</li>
          <li>• Prevents subnet scans that can pull in unrelated devices</li>
          <li>• Lets you add the same style of target first, sensors later</li>
        </ul>
      </div>
    </div>
  );
}
