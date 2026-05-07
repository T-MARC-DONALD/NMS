from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import Index

db = SQLAlchemy()

class NetworkDevice(db.Model):
    """Network device model"""
    __tablename__ = 'network_devices'
    
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(50), unique=True, nullable=False, index=True)
    hostname = db.Column(db.String(255), nullable=True)
    device_type = db.Column(db.String(50), nullable=False)  # router, switch, server, etc.
    location = db.Column(db.String(255), nullable=True)
    snmp_community = db.Column(db.String(100), default='public')
    snmp_version = db.Column(db.String(10), default='2c')
    port = db.Column(db.Integer, default=161)
    enabled = db.Column(db.Boolean, default=True)
    status = db.Column(db.String(20), default='unknown')  # up, down, unknown
    last_seen = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    events = db.relationship('NetworkEvent', backref='device', lazy=True, cascade='all, delete-orphan')
    interfaces = db.relationship('NetworkInterface', backref='device', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<NetworkDevice {self.ip_address}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'ip_address': self.ip_address,
            'hostname': self.hostname,
            'device_type': self.device_type,
            'location': self.location,
            'enabled': self.enabled,
            'status': self.status,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class NetworkEvent(db.Model):
    """Network event/trap model"""
    __tablename__ = 'network_events'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('network_devices.id'), nullable=False, index=True)
    event_type = db.Column(db.String(50), nullable=False)  # trap, threshold, link_change, etc.
    severity = db.Column(db.String(20), default='info')  # critical, warning, info
    oid = db.Column(db.String(255), nullable=True)
    message = db.Column(db.Text, nullable=False)
    value = db.Column(db.String(255), nullable=True)
    resolved = db.Column(db.Boolean, default=False)
    resolved_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    __table_args__ = (Index('idx_device_created', 'device_id', 'created_at'),)
    
    def __repr__(self):
        return f'<NetworkEvent {self.event_type} - {self.severity}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'device_ip': self.device.ip_address if self.device else None,
            'device_hostname': self.device.hostname if self.device else None,
            'event_type': self.event_type,
            'severity': self.severity,
            'oid': self.oid,
            'message': self.message,
            'value': self.value,
            'resolved': self.resolved,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'created_at': self.created_at.isoformat()
        }

class NetworkInterface(db.Model):
    """Network interface model for inventory"""
    __tablename__ = 'network_interfaces'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('network_devices.id'), nullable=False, index=True)
    interface_index = db.Column(db.String(50), nullable=False)
    interface_name = db.Column(db.String(255), nullable=False)
    interface_type = db.Column(db.String(50), nullable=True)
    ip_address = db.Column(db.String(50), nullable=True)
    mac_address = db.Column(db.String(50), nullable=True)
    status = db.Column(db.String(20), default='up')  # up, down
    speed = db.Column(db.String(50), nullable=True)  # e.g. "1Gbps"
    incoming_traffic = db.Column(db.Float, default=0.0)
    outgoing_traffic = db.Column(db.Float, default=0.0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<NetworkInterface {self.interface_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'interface_index': self.interface_index,
            'interface_name': self.interface_name,
            'interface_type': self.interface_type,
            'ip_address': self.ip_address,
            'mac_address': self.mac_address,
            'status': self.status,
            'speed': self.speed,
            'incoming_traffic': self.incoming_traffic,
            'outgoing_traffic': self.outgoing_traffic,
            'last_updated': self.last_updated.isoformat()
        }

class BillingRecord(db.Model):
    """Billing records for SLA tracking"""
    __tablename__ = 'billing_records'
    
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(50), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    total_traffic_in = db.Column(db.Float, default=0.0)  # in GB
    total_traffic_out = db.Column(db.Float, default=0.0)  # in GB
    total_traffic = db.Column(db.Float, default=0.0)  # in GB
    rate_per_gb = db.Column(db.Float, default=0.1)
    total_cost = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<BillingRecord {self.ip_address} - {self.date}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'ip_address': self.ip_address,
            'date': self.date.isoformat(),
            'total_traffic_in': self.total_traffic_in,
            'total_traffic_out': self.total_traffic_out,
            'total_traffic': self.total_traffic,
            'rate_per_gb': self.rate_per_gb,
            'total_cost': self.total_cost,
            'created_at': self.created_at.isoformat()
        }
