"""SNMP data collector module"""
from pysnmp.hlapi import *
from pysnmp.smi import builder, view
import logging
from models import db, NetworkDevice, NetworkEvent, NetworkInterface
from datetime import datetime

logger = logging.getLogger(__name__)

# Common OIDs
OID_SYSUPTIME = '1.3.6.1.2.1.1.3.0'
OID_SYSDESCR = '1.3.6.1.2.1.1.1.0'
OID_SYSNAME = '1.3.6.1.2.1.1.5.0'
OID_IFNUMBER = '1.3.6.1.2.1.2.1.0'
OID_IFTABLE = '1.3.6.1.2.1.2.2.1'
OID_IFINDEX = '1.3.6.1.2.1.2.2.1.1'
OID_IFNAME = '1.3.6.1.2.1.2.2.1.2'
OID_IFTYPE = '1.3.6.1.2.1.2.2.1.3'
OID_IFMTU = '1.3.6.1.2.1.2.2.1.4'
OID_IFSPEED = '1.3.6.1.2.1.2.2.1.5'
OID_IFPHYSADDRESS = '1.3.6.1.2.1.2.2.1.6'
OID_IFADMINSTATUS = '1.3.6.1.2.1.2.2.1.7'
OID_IFOPERSTATUS = '1.3.6.1.2.1.2.2.1.8'
OID_IFINOCTETS = '1.3.6.1.2.1.2.2.1.10'
OID_IFOUTOCTETS = '1.3.6.1.2.1.2.2.1.16'

class SNMPCollector:
    """SNMP data collector"""
    
    def __init__(self, timeout=1, retries=0):
        self.timeout = timeout
        self.retries = retries
    
    def get_snmp_data(self, ip_address, oid, community='public', version='2c', port=161):
        """Get single OID value via SNMP"""
        try:
            iterator = getCmd(
                SnmpEngine(),
                CommunityData(community, mpModel=1 if version == '2c' else 0),
                UdpTransportTarget((ip_address, port), timeout=self.timeout, retries=self.retries),
                ContextData(),
                ObjectType(ObjectIdentity(oid))
            )
            
            errorIndication, errorStatus, errorIndex, varBinds = next(iterator)
            
            if errorIndication:
                logger.error(f"SNMP error from {ip_address}: {errorIndication}")
                return None
            else:
                if errorStatus:
                    logger.error(f"SNMP error from {ip_address}: {errorStatus.prettyPrint()}")
                    return None
                else:
                    return varBinds[0][1].prettyPrint()
        except Exception as e:
            logger.error(f"Exception getting SNMP data from {ip_address}: {str(e)}")
            return None
    
    def get_snmp_table(self, ip_address, oid_base, community='public', version='2c', port=161):
        """Get SNMP table (bulk data)"""
        try:
            iterator = bulkCmd(
                SnmpEngine(),
                CommunityData(community, mpModel=1 if version == '2c' else 0),
                UdpTransportTarget((ip_address, port), timeout=self.timeout, retries=self.retries),
                ContextData(),
                0, 25,
                ObjectType(ObjectIdentity(oid_base)),
                lexicographicMode=False
            )
            
            results = []
            for errorIndication, errorStatus, errorIndex, varBinds in iterator:
                if errorIndication:
                    logger.error(f"SNMP bulk error from {ip_address}: {errorIndication}")
                    break
                else:
                    if errorStatus:
                        logger.error(f"SNMP bulk error from {ip_address}: {errorStatus.prettyPrint()}")
                        break
                    else:
                        for varBind in varBinds:
                            results.append({
                                'oid': str(varBind[0]),
                                'value': varBind[1].prettyPrint()
                            })
            return results
        except Exception as e:
            logger.error(f"Exception getting SNMP table from {ip_address}: {str(e)}")
            return []
    
    def check_device_status(self, device):
        """Check if device is reachable via SNMP"""
        try:
            previous_status = device.status
            result = self.get_snmp_data(
                device.ip_address,
                OID_SYSUPTIME,
                device.snmp_community,
                device.snmp_version,
                device.port
            )
            
            if result:
                device.status = 'up'
                device.last_seen = datetime.utcnow()
                logger.info(f"Device {device.ip_address} is UP")
                
                # Create event if device was previously down
                if previous_status != 'up':
                    event = NetworkEvent(
                        device_id=device.id,
                        event_type='device_up',
                        severity='info',
                        message=f"Device {device.ip_address} is back online",
                        oid=OID_SYSUPTIME
                    )
                    db.session.add(event)
                return True
            else:
                device.status = 'down'
                logger.warning(f"Device {device.ip_address} is DOWN")
                
                # Create event if device was previously up
                if previous_status == 'up':
                    event = NetworkEvent(
                        device_id=device.id,
                        event_type='device_down',
                        severity='critical',
                        message=f"Device {device.ip_address} is unreachable",
                        oid=OID_SYSUPTIME
                    )
                    db.session.add(event)
                return False
        except Exception as e:
            logger.error(f"Error checking device {device.ip_address}: {str(e)}")
            device.status = 'unknown'
            return False
    
    def collect_device_info(self, device):
        """Collect device information"""
        try:
            # Get system description
            sysname = self.get_snmp_data(
                device.ip_address,
                OID_SYSNAME,
                device.snmp_community,
                device.snmp_version,
                device.port
            )
            
            if sysname:
                device.hostname = sysname
                logger.info(f"Device name: {sysname}")
            
            # Get uptime
            uptime = self.get_snmp_data(
                device.ip_address,
                OID_SYSUPTIME,
                device.snmp_community,
                device.snmp_version,
                device.port
            )
            
            if uptime:
                logger.info(f"Device uptime: {uptime}")
            
            return True
        except Exception as e:
            logger.error(f"Error collecting device info for {device.ip_address}: {str(e)}")
            return False
    
    def collect_interfaces(self, device):
        """Collect interface data from device"""
        try:
            # Get interface table
            if_entries = self.get_snmp_table(
                device.ip_address,
                OID_IFTABLE,
                device.snmp_community,
                device.snmp_version,
                device.port
            )
            
            if not if_entries:
                logger.warning(f"No interfaces found for {device.ip_address}")
                return False
            
            # Parse interface data
            interfaces = {}
            for entry in if_entries:
                oid_parts = entry['oid'].split('.')
                if len(oid_parts) >= 11:
                    idx = oid_parts[10]
                    oid_type = oid_parts[9]
                    
                    if idx not in interfaces:
                        interfaces[idx] = {'index': idx}
                    
                    # Map OID types to field names
                    if oid_type == '2':
                        interfaces[idx]['name'] = entry['value']
                    elif oid_type == '3':
                        interfaces[idx]['type'] = entry['value']
                    elif oid_type == '6':
                        interfaces[idx]['mac'] = entry['value']
                    elif oid_type == '8':
                        interfaces[idx]['status'] = 'up' if entry['value'] == '1' else 'down'
            
            # Store interfaces in database
            for if_data in interfaces.values():
                existing = NetworkInterface.query.filter_by(
                    device_id=device.id,
                    interface_index=if_data.get('index')
                ).first()
                
                if existing:
                    existing.interface_name = if_data.get('name', 'Unknown')
                    existing.interface_type = if_data.get('type', 'Unknown')
                    existing.mac_address = if_data.get('mac', 'Unknown')
                    existing.status = if_data.get('status', 'unknown')
                else:
                    new_interface = NetworkInterface(
                        device_id=device.id,
                        interface_index=if_data.get('index'),
                        interface_name=if_data.get('name', 'Unknown'),
                        interface_type=if_data.get('type', 'Unknown'),
                        mac_address=if_data.get('mac', 'Unknown'),
                        status=if_data.get('status', 'unknown')
                    )
                    db.session.add(new_interface)
            
            logger.info(f"Collected {len(interfaces)} interfaces for {device.ip_address}")
            return True
        except Exception as e:
            logger.error(f"Error collecting interfaces for {device.ip_address}: {str(e)}")
            return False
    
    def poll_device(self, device):
        """Poll a device for data"""
        if not device.enabled:
            return False
        
        logger.info(f"Polling device: {device.ip_address}")
        
        # Check status
        if not self.check_device_status(device):
            db.session.commit()
            return False
        
        # Collect device info
        self.collect_device_info(device)
        
        # Collect interfaces
        self.collect_interfaces(device)
        
        db.session.commit()
        return True
