"""API endpoints for NMS"""
from flask import Blueprint, request, jsonify
from models import db, NetworkDevice, NetworkEvent, NetworkInterface, BillingRecord
from datetime import datetime, timedelta
from sqlalchemy import func, desc
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

# ==================== DEVICE ENDPOINTS ====================

@api_bp.route('/devices', methods=['GET'])
def get_devices():
    """Get all network devices"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status = request.args.get('status', None)
        
        query = NetworkDevice.query
        
        if status:
            query = query.filter_by(status=status)
        
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
                'ping_output': ping_output.strip()
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
                                device.events.order_by(desc(NetworkEvent.created_at)).limit(10)]
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
                'events_24h': events_24h
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

# ==================== HEALTH CHECK ====================

@api_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'success': True, 'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})
