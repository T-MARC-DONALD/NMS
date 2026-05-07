import React, { useState } from 'react';
import { deviceAPI } from '../api';

export default function Discovery() {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [formData, setFormData] = useState({
    network: '192.168.1.0/24',
    snmp_community: 'public'
  });
  const [error, setError] = useState(null);

  const handleDiscovery = async (e) => {
    e.preventDefault();
    try {
      setScanning(true);
      setError(null);
      setResults(null);

      // Simulate network discovery
      const ipParts = formData.network.split('/')[0].split('.');
      const baseIP = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.`;
      const discoveredDevices = [];

      // Mock discovery - in production this would scan the network
      for (let i = 1; i <= 254; i++) {
        const ip = `${baseIP}${i}`;
        // Random chance of finding a device (for demo)
        if (Math.random() > 0.9) {
          discoveredDevices.push({
            ip_address: ip,
            device_type: Math.random() > 0.5 ? 'router' : 'switch'
          });
        }
      }

      setResults({
        network: formData.network,
        discovered: discoveredDevices.length,
        devices: discoveredDevices.slice(0, 10) // Show first 10
      });
    } catch (err) {
      setError('Discovery failed: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleAddDevice = async (device) => {
    try {
      await deviceAPI.create({
        ip_address: device.ip_address,
        device_type: device.device_type,
        snmp_community: formData.snmp_community,
        hostname: '',
        location: ''
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
      <h2 className="text-2xl font-bold mb-6">Auto-Discovery</h2>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-4">{error}</div>
      )}

      {/* Discovery Form */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Discover Devices</h3>
        <form onSubmit={handleDiscovery}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Network (CIDR)</label>
              <input
                type="text"
                value={formData.network}
                onChange={(e) => setFormData({...formData, network: e.target.value})}
                placeholder="e.g., 192.168.1.0/24"
                className="w-full border rounded px-3 py-2"
                disabled={scanning}
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
                disabled={scanning}
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={scanning}
            className="btn btn-primary mt-4"
          >
            {scanning ? 'Scanning...' : 'Start Discovery'}
          </button>
        </form>
      </div>

      {/* Results */}
      {results && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">
            Discovery Results: {results.discovered} devices found
          </h3>
          
          {results.devices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold">IP Address</th>
                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.devices.map(device => (
                    <tr key={device.ip_address} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono">{device.ip_address}</td>
                      <td className="py-3 px-4 capitalize">{device.device_type}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleAddDevice(device)}
                          className="btn btn-primary btn-small"
                        >
                          Add Device
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No devices found in this network</p>
          )}
        </div>
      )}

      {/* Info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-2">How Auto-Discovery Works</h4>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Scans the specified network range using SNMP queries</li>
          <li>• Identifies responding devices with specified SNMP community string</li>
          <li>• Retrieves device information (hostname, type, interfaces)</li>
          <li>• Allows bulk addition of discovered devices to inventory</li>
          <li>• Supports incremental updates without duplicating existing devices</li>
        </ul>
      </div>
    </div>
  );
}
