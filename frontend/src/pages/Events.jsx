import React, { useState, useEffect } from 'react';
import { eventAPI } from '../api';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    severity: '',
    resolved: ''
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const filterParams = {};
      if (filters.severity) filterParams.severity = filters.severity;
      if (filters.resolved) filterParams.resolved = filters.resolved === 'true';
      
      const res = await eventAPI.getAll(page, 20, filterParams);
      setEvents(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      setError('Failed to load events');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, filters]);

  const handleResolve = async (id) => {
    try {
      await eventAPI.resolve(id);
      fetchEvents();
    } catch (err) {
      setError('Failed to resolve event');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({...filters, [name]: value});
    setPage(1);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Network Events</h2>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-4">{error}</div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            name="severity"
            value={filters.severity}
            onChange={handleFilterChange}
            className="border rounded px-3 py-2"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          
          <select
            name="resolved"
            value={filters.resolved}
            onChange={handleFilterChange}
            className="border rounded px-3 py-2"
          >
            <option value="">All Events</option>
            <option value="false">Unresolved</option>
            <option value="true">Resolved</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading events...</div>
      ) : (
        <div className="card">
          {events.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold">Time</th>
                      <th className="text-left py-3 px-4 font-semibold">Device</th>
                      <th className="text-left py-3 px-4 font-semibold">Type</th>
                      <th className="text-left py-3 px-4 font-semibold">Severity</th>
                      <th className="text-left py-3 px-4 font-semibold">Message</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(event => (
                      <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-500 text-xs">
                          {new Date(event.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">{event.device_hostname || event.device_ip}</td>
                        <td className="py-3 px-4">{event.event_type}</td>
                        <td className="py-3 px-4">
                          <span className={`severity-${event.severity}`}>
                            {event.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4">{event.message}</td>
                        <td className="py-3 px-4">
                          <span className={event.resolved ? 'text-gray-500' : 'text-yellow-600 font-semibold'}>
                            {event.resolved ? 'Resolved' : 'Open'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {!event.resolved && (
                            <button
                              onClick={() => handleResolve(event.id)}
                              className="btn btn-primary btn-small"
                            >
                              Resolve
                            </button>
                          )}
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
                  disabled={page * 20 >= total}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">No events found</p>
          )}
        </div>
      )}
    </div>
  );
}
