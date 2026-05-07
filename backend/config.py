import os
from datetime import timedelta

class Config:
    """Base configuration"""
    SQLALCHEMY_DATABASE_URI = 'sqlite:///./nms.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False
    
    # SNMP Configuration
    SNMP_VERSION = '2c'
    SNMP_TIMEOUT = 1
    SNMP_RETRIES = 0
    SNMP_COMMUNITY_RO = 'public'
    SNMP_COMMUNITY_RW = 'private'
    
    # Polling Configuration
    POLLING_INTERVAL = 60  # seconds
    DATA_RETENTION_DAYS = 30
    
    # Scheduler
    SCHEDULER_JOBSTORES = {
        'default': {'type': 'memory'}
    }
    SCHEDULER_EXECUTORS = {
        'default': {'type': 'threadpool', 'max_workers': 20}
    }
    SCHEDULER_JOB_DEFAULTS = {
        'coalesce': False,
        'max_instances': 1
    }
    
class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    
class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
