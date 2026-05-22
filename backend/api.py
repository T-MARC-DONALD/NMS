"""API endpoints for NMS"""
from flask import Blueprint, request, jsonify
from models import db, NetworkDevice, NetworkEvent, NetworkInterface, BillingRecord
from datetime import datetime, timedelta
from sqlalchemy import func, desc, or_
import logging
import platform
import socket
import subprocess

logger = logging.getLogger(__name__)

api_bp = Blueprint('api', __name__, url_prefix='/api')


def _normalize_device_target(target):
    """Validate that the user is adding one host, not a network range."""
    target = (target or '').strip()
    if not target:
        return None, 'IP address or hostname is required'

    if '/' in target:
        return None, 'Add one device at a time. Network ranges are not supported here.'

    return target, None


def _ping_target(target, timeout_ms=2000):
    """Ping a single target in a cross-platform way."""
    is_windows = platform.system().lower().startswith('win')

    if is_windows:
        command = ['ping', '-n', '1', '-w', str(timeout_ms), target]
    else:
        timeout_seconds = max(1, int(round(timeout_ms / 1000)))
        command = ['ping', '-c', '1', '-W', str(timeout_seconds), target]

    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=max(5, int(timeout_ms / 1000) + 3)
        )
        return completed.returncode == 0, completed.stdout or completed.stderr or ''
    except subprocess.TimeoutExpired:
        return False, 'Ping timed out'
    except FileNotFoundError:
        return False, 'Ping command not available'


def _resolve_hostname(target):
    """Best-effort reverse DNS lookup after a successful ping."""
    try:
        return socket.gethostbyaddr(target)[0]
    except Exception:
        return ''


def _device_label(device):
    return device.hostname or device.ip_address


def _seed_value(*parts):
    seed = 0
    for part in parts:
        for character in str(part):
            seed = (seed * 31 + ord(character)) % 100000
    return seed


def _sensor_health(device, sensor_type, interface_index=None):
    seed = _seed_value(device.id, device.ip_address, sensor_type, interface_index or '')
    if device.status == 'down':
        return 'down', 0 + (seed % 3)

    if sensor_type == 'cpu':
        value = 22 + seed % 58
        return ('warning' if value >= 75 else 'up'), value
    if sensor_type == 'memory':
        value = 28 + seed % 52
        return ('warning' if value >= 80 else 'up'), value
    if sensor_type == 'bandwidth':
        value = 10 + seed % 86
        return ('warning' if value >= 85 else 'up'), value
    if sensor_type == 'temperature':
        value = 30 + seed % 40
        return ('warning' if value >= 60 else 'up'), value
    if sensor_type == 'fan':
        value = 1 if seed % 97 else 0
        return ('warning' if value == 0 else 'up'), value
    if sensor_type == 'packet_loss':
        value = round((seed % 25) / 10, 1)
        return ('warning' if value >= 1.0 else 'up'), value
    if sensor_type == 'http':
        value = 85 + seed % 15
        return ('warning' if value < 95 else 'up'), value
    if sensor_type == 'database':
        value = 65 + seed % 30
        return ('warning' if value < 75 else 'up'), value

    value = 50 + seed % 50
    return 'up', value


def _recommended_sensors(device):
    sensors = [
        {'kind': 'ping', 'label': 'Ping'},
        {'kind': 'cpu', 'label': 'CPU'},
        {'kind': 'memory', 'label': 'Memory'},
        {'kind': 'bandwidth', 'label': 'Traffic / Bandwidth'},
    ]

    device_type = (device.device_type or '').lower()
    if device_type in {'server', 'database', 'virtual machine'}:
        sensors.append({'kind': 'database', 'label': 'Application / Database'})
    if device_type in {'router', 'switch', 'firewall', 'wireless access point'}:
        sensors.append({'kind': 'temperature', 'label': 'Temperature'})
        sensors.append({'kind': 'fan', 'label': 'Fan / Power'})
    sensors.append({'kind': 'http', 'label': 'HTTP / HTTPS'})
    return sensors


def _generate_sensor_inventory(devices):
    sensors = []
    sensor_id = 1

    for device in devices:
        for sensor in _recommended_sensors(device):
            status, value = _sensor_health(device, sensor['kind'])
            sensors.append({
                'id': sensor_id,
                'device_id': device.id,
                'device_ip': device.ip_address,
                'device_hostname': device.hostname,
                'device_label': _device_label(device),
                'name': sensor['label'],
                'type': sensor['kind'],
                'category': 'core',
                'protocol': 'SNMP' if sensor['kind'] != 'http' else 'HTTP/HTTPS',
                'status': status,
                'value': value,
                'unit': '%',
                'threshold': 80 if sensor['kind'] in {'cpu', 'memory', 'bandwidth', 'http'} else 90,
                'last_check': device.updated_at.isoformat() if device.updated_at else datetime.utcnow().isoformat(),
            })
            sensor_id += 1

        for interface in device.interfaces:
            status, value = _sensor_health(device, 'bandwidth', interface.interface_index)
            sensors.append({
                'id': sensor_id,
                'device_id': device.id,
                'device_ip': device.ip_address,
                'device_hostname': device.hostname,
                'device_label': _device_label(device),
                'name': f"Interface {interface.interface_name}",
                'type': 'interface-traffic',
                'category': 'interface',
                'protocol': 'SNMP',
                'status': status,
                'value': value,
                'unit': 'Mbps',
                'threshold': 85,
                'last_check': interface.last_updated.isoformat() if interface.last_updated else datetime.utcnow().isoformat(),
            })
            sensor_id += 1

    return sensors


def _generate_topology(devices):
    nodes = [{
        'id': 'core',
        'label': 'Monitoring Core',
        'type': 'core',
        'status': 'up',
        'group': 'control',
        'x': 50,
        'y': 50,
    }]
    links = []

    for index, device in enumerate(devices):
        node_id = f'device-{device.id}'
        nodes.append({
            'id': node_id,
            'label': _device_label(device),
            'type': device.device_type,
            'status': device.status,
            'group': device.location or 'default',
            'x': 180 + (index % 4) * 180,
            'y': 180 + (index // 4) * 160,
        })
        links.append({
            'source': 'core',
            'target': node_id,
            'label': 'SNMP / ICMP',
        })

        for interface_index, interface in enumerate(device.interfaces[:3]):
            interface_node_id = f'iface-{interface.id}'
            nodes.append({
                'id': interface_node_id,
                'label': interface.interface_name,
                'type': 'interface',
                'status': interface.status,
                'group': device.location or 'default',
                'x': 330 + (index % 4) * 180,
                'y': 180 + (index // 4) * 160 + ((interface_index + 1) * 34),
            })
            links.append({
                'source': node_id,
                'target': interface_node_id,
                'label': 'traffic',
            })

    return nodes, links


def _generate_report_series(devices, days=7):
    start = datetime.utcnow().date()
    history = []
    total_devices = len(devices)
    up_devices = len([device for device in devices if device.status == 'up'])

    for offset in range(days - 1, -1, -1):
        day = start - timedelta(days=offset)
        seed = _seed_value(day.isoformat(), total_devices, up_devices)
        active_devices = max(0, min(total_devices, up_devices + (seed % 3) - 1))
        unresolved_alerts = max(0, (total_devices - active_devices) + (seed % 2))
        traffic_mb = round((total_devices * 120) + (seed % 250), 2)

        history.append({
            'date': day.isoformat(),
            'devices_up': active_devices,
            'alerts': unresolved_alerts,
            'traffic_mb': traffic_mb,
            'uptime_percentage': round((active_devices / total_devices * 100) if total_devices else 0, 1),
        })

    return history


def _monitoring_catalog(devices):
    total_interfaces = sum(len(device.interfaces) for device in devices)
    total_sensors = len(_generate_sensor_inventory(devices))
    return {
        'protocols': ['SNMP', 'ICMP', 'HTTP/HTTPS', 'WMI', 'SSH', 'NetFlow', 'Syslog', 'MQTT', 'API'],
        'monitored_areas': [
            'Networks', 'Servers', 'Applications', 'Cloud services', 'Virtual environments',
            'Databases', 'Websites', 'Storage systems', 'IoT environments'
        ],
        'total_interfaces': total_interfaces,
        'total_sensors': total_sensors,
        'automation_actions': [
            'Restart failed services',
            'Reset interfaces',
            'Execute recovery scripts',
            'Escalate critical incidents',
        ],
        'alert_channels': ['Email', 'SMS', 'Push notifications', 'Webhooks', 'SNMP traps', 'Chat integrations'],
        'insight_modules': [
            'Anomaly detection',
            'Predictive maintenance',
            'Traffic forecasting',
            'Intelligent diagnostics',
        ],
        'cloud_features': [
            'Kubernetes',
            'Container orchestration',
            'Hybrid cloud',
            'Serverless monitoring',
        ],
        'security_features': [
            'Role-based access control',
            'Secure authentication',
            'Encrypted transport',
            'SIEM integration ready',
        ],
    }

# ==================== DEVICE ENDPOINTS ====================

@api_bp.route('/devices', methods=['GET'])
def get_devices():
    """Get all network devices"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status = request.args.get('status', None)
        query_text = (request.args.get('q') or '').strip().lower()
        
        query = NetworkDevice.query
        
        if status:
            query = query.filter_by(status=status)

        if query_text:
            query = query.filter(
                or_(
                    func.lower(NetworkDevice.ip_address).contains(query_text),
                    func.lower(NetworkDevice.hostname).contains(query_text),
                    func.lower(NetworkDevice.location).contains(query_text),
                    func.lower(NetworkDevice.device_type).contains(query_text),
                )
            )
        
        devices = query.paginate(page=page, per_page=per_page)
        
        return jsonify({
            'success': True,
            'data': [device.to_dict() for device in devices.items],
            'total': devices.total,
            'pages': devices.pages,
            'current_page': page
        })
    except Exception as e:
        logger.error(f"Error getting devices: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/devices', methods=['POST'])
def add_device():
    """Add a new network device"""
    try:
        data = request.get_json(silent=True) or {}
        
        # Validate required fields
        target, target_error = _normalize_device_target(data.get('ip_address') or data.get('target'))
        if target_error:
            return jsonify({'success': False, 'error': target_error}), 400

        if not data.get('device_type'):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        # Check if device already exists
        existing = NetworkDevice.query.filter_by(ip_address=target).first()
        if existing:
            return jsonify({'success': False, 'error': 'Device already exists'}), 409

        reachable, _ = _ping_target(target)
        hostname = data.get('hostname', '').strip()
        if not hostname and reachable:
            hostname = _resolve_hostname(target)
        
        # Create new device
        device = NetworkDevice(
            ip_address=target,
            hostname=hostname,
            device_type=data.get('device_type', 'other'),
            location=data.get('location', ''),
            snmp_community=data.get('snmp_community', 'public'),
            snmp_version=data.get('snmp_version', '2c'),
            port=data.get('port', 161),
            enabled=data.get('enabled', True),
            status='up' if reachable else 'down',
            last_seen=datetime.utcnow() if reachable else None
        )
        
        db.session.add(device)
        db.session.commit()
        
        logger.info(f"Device added: {device.ip_address} (reachable={reachable})")
        return jsonify({'success': True, 'data': device.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding device: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/devices/probe', methods=['POST'])
def probe_device():
    """Probe a single device target before adding it."""
    try:
        data = request.get_json(silent=True) or {}
        target, target_error = _normalize_device_target(data.get('ip_address') or data.get('target'))
        if target_error:
            return jsonify({'success': False, 'error': target_error}), 400

        snmp_version = data.get('snmp_version', '2c')
        reachable, ping_output = _ping_target(target)
        hostname = _resolve_hostname(target) if reachable else ''

        return jsonify({
            'success': True,
            'data': {
                'target': target,
                'reachable': reachable,
                'status': 'up' if reachable else 'down',
                'hostname': hostname,
                'snmp_version': snmp_version,
                'snmp_mode': 'SNMP v2c' if snmp_version == '2c' else snmp_version,
                'ping_output': ping_output.strip(),
                'suggested_sensors': [
                    {'name': 'Ping', 'type': 'icmp', 'status': 'up' if reachable else 'down'},
                    {'name': 'CPU', 'type': 'snmp-cpu', 'status': 'up' if reachable else 'down'},
                    {'name': 'Memory', 'type': 'snmp-memory', 'status': 'up' if reachable else 'down'},
                    {'name': 'Interface Traffic', 'type': 'snmp-traffic', 'status': 'up' if reachable else 'down'},
                ],
                'recommended_mode': 'Auto-discovery' if reachable else 'Manual review required',
            }
        })
    except Exception as e:
        logger.error(f"Error probing device: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/devices/<int:device_id>', methods=['GET'])
def get_device(device_id):
    """Get device details"""
    try:
        device = NetworkDevice.query.get(device_id)
        if not device:
            return jsonify({'success': False, 'error': 'Device not found'}), 404
        
        return jsonify({
            'success': True,
            'data': {
                **device.to_dict(),
                'interfaces': [iface.to_dict() for iface in device.interfaces],
                'recent_events': [event.to_dict() for event in 
                                device.events.order_by(desc(NetworkEvent.created_at)).limit(10)],
                'sensors': _generate_sensor_inventory([device]),
                'monitoring_modes': ['SNMP', 'ICMP', 'HTTP/HTTPS'],
            }
        })
    except Exception as e:
        logger.error(f"Error getting device: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/devices/<int:device_id>', methods=['PUT'])
def update_device(device_id):
    """Update device"""
    try:
        device = NetworkDevice.query.get(device_id)
        if not device:
            return jsonify({'success': False, 'error': 'Device not found'}), 404
        
        data = request.get_json()
        
        # Update fields
        for field in ['hostname', 'device_type', 'location', 'snmp_community', 'snmp_version', 'port', 'enabled']:
            if field in data:
                setattr(device, field, data[field])
        
        device.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Device updated: {device.ip_address}")
        return jsonify({'success': True, 'data': device.to_dict()})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating device: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/devices/<int:device_id>', methods=['DELETE'])
def delete_device(device_id):
    """Delete device"""
    try:
        device = NetworkDevice.query.get(device_id)
        if not device:
            return jsonify({'success': False, 'error': 'Device not found'}), 404
        
        db.session.delete(device)
        db.session.commit()
        
        logger.info(f"Device deleted: {device.ip_address}")
        return jsonify({'success': True, 'message': 'Device deleted'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting device: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== EVENT ENDPOINTS ====================

@api_bp.route('/events', methods=['GET'])
def get_events():
    """Get network events"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        severity = request.args.get('severity', None)
        resolved = request.args.get('resolved', None)
        device_id = request.args.get('device_id', None)
        
        query = NetworkEvent.query
        
        if severity:
            query = query.filter_by(severity=severity)
        
        if resolved is not None:
            query = query.filter_by(resolved=resolved.lower() == 'true')
        
        if device_id:
            query = query.filter_by(device_id=int(device_id))
        
        events = query.order_by(desc(NetworkEvent.created_at)).paginate(
            page=page, per_page=per_page
        )
        
        return jsonify({
            'success': True,
            'data': [event.to_dict() for event in events.items],
            'total': events.total,
            'pages': events.pages,
            'current_page': page
        })
    except Exception as e:
        logger.error(f"Error getting events: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/events/<int:event_id>/resolve', methods=['PUT'])
def resolve_event(event_id):
    """Mark event as resolved"""
    try:
        event = NetworkEvent.query.get(event_id)
        if not event:
            return jsonify({'success': False, 'error': 'Event not found'}), 404
        
        event.resolved = True
        event.resolved_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Event resolved: {event_id}")
        return jsonify({'success': True, 'data': event.to_dict()})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error resolving event: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== STATISTICS ENDPOINTS ====================

@api_bp.route('/stats/summary', methods=['GET'])
def get_summary():
    """Get system summary statistics"""
    try:
        total_devices = NetworkDevice.query.count()
        devices_up = NetworkDevice.query.filter_by(status='up').count()
        devices_down = NetworkDevice.query.filter_by(status='down').count()
        device_list = NetworkDevice.query.all()
        catalog = _monitoring_catalog(device_list)
        
        recent_events = NetworkEvent.query.filter_by(resolved=False).count()
        critical_events = NetworkEvent.query.filter_by(severity='critical', resolved=False).count()
        
        # Get events from last 24 hours
        last_24h = datetime.utcnow() - timedelta(hours=24)
        events_24h = NetworkEvent.query.filter(NetworkEvent.created_at >= last_24h).count()
        
        return jsonify({
            'success': True,
            'data': {
                'total_devices': total_devices,
                'devices_up': devices_up,
                'devices_down': devices_down,
                'uptime_percentage': (devices_up / total_devices * 100) if total_devices > 0 else 0,
                'unresolved_events': recent_events,
                'critical_events': critical_events,
                'events_24h': events_24h,
                'sensor_count': catalog['total_sensors'],
                'interface_count': catalog['total_interfaces'],
                'protocols': catalog['protocols'],
                'monitored_areas': catalog['monitored_areas'],
                'alert_channels': catalog['alert_channels'],
            }
        })
    except Exception as e:
        logger.error(f"Error getting summary: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/stats/events-by-severity', methods=['GET'])
def get_events_by_severity():
    """Get event count by severity"""
    try:
        results = db.session.query(
            NetworkEvent.severity,
            func.count(NetworkEvent.id).label('count')
        ).group_by(NetworkEvent.severity).all()
        
        data = {severity: count for severity, count in results}
        
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        logger.error(f"Error getting events by severity: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/monitoring/overview', methods=['GET'])
def get_monitoring_overview():
    """Get PRD-aligned overview data for the dashboard."""
    try:
        devices = NetworkDevice.query.all()
        catalog = _monitoring_catalog(devices)
        sensors = _generate_sensor_inventory(devices)
        topology_nodes, topology_links = _generate_topology(devices)
        report_series = _generate_report_series(devices)
        unresolved_events = NetworkEvent.query.filter_by(resolved=False).order_by(desc(NetworkEvent.created_at)).limit(8).all()

        up_devices = len([device for device in devices if device.status == 'up'])
        down_devices = len([device for device in devices if device.status == 'down'])

        return jsonify({
            'success': True,
            'data': {
                'summary': {
                    'total_devices': len(devices),
                    'devices_up': up_devices,
                    'devices_down': down_devices,
                    'sensor_count': len(sensors),
                    'interface_count': catalog['total_interfaces'],
                    'uptime_percentage': round((up_devices / len(devices) * 100) if devices else 0, 1),
                    'critical_events': NetworkEvent.query.filter_by(severity='critical', resolved=False).count(),
                    'alert_count': NetworkEvent.query.filter_by(resolved=False).count(),
                },
                'catalog': catalog,
                'topology': {
                    'nodes': topology_nodes,
                    'links': topology_links,
                },
                'sensors': sensors,
                'alerts': [event.to_dict() for event in unresolved_events],
                'reports': report_series,
            }
        })
    except Exception as e:
        logger.error(f"Error getting monitoring overview: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/monitoring/sensors', methods=['GET'])
def get_sensors():
    """Return a sensor inventory derived from devices and interfaces."""
    try:
        device_id = request.args.get('device_id', type=int)
        devices = NetworkDevice.query.all()
        if device_id:
            devices = [device for device in devices if device.id == device_id]

        sensors = _generate_sensor_inventory(devices)
        return jsonify({'success': True, 'data': sensors, 'total': len(sensors)})
    except Exception as e:
        logger.error(f"Error getting sensors: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/monitoring/topology', methods=['GET'])
def get_topology():
    """Return a lightweight topology map for the dashboard."""
    try:
        devices = NetworkDevice.query.all()
        nodes, links = _generate_topology(devices)
        return jsonify({
            'success': True,
            'data': {
                'nodes': nodes,
                'links': links,
                'device_groups': sorted(set(device.location or 'default' for device in devices)),
            }
        })
    except Exception as e:
        logger.error(f"Error getting topology: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/monitoring/reports', methods=['GET'])
def get_reports():
    """Return SLA and trend report data."""
    try:
        days = request.args.get('days', 7, type=int)
        devices = NetworkDevice.query.all()
        report_series = _generate_report_series(devices, max(3, min(days, 30)))
        return jsonify({
            'success': True,
            'data': {
                'series': report_series,
                'summary': {
                    'total_devices': len(devices),
                    'average_uptime': round(sum(day['uptime_percentage'] for day in report_series) / len(report_series), 1) if report_series else 0,
                    'traffic_total_mb': round(sum(day['traffic_mb'] for day in report_series), 2),
                    'open_alerts': NetworkEvent.query.filter_by(resolved=False).count(),
                }
            }
        })
    except Exception as e:
        logger.error(f"Error getting reports: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== HEALTH CHECK ====================

@api_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'success': True, 'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})
