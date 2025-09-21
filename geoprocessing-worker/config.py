#!/usr/bin/env python3
"""
إعدادات Worker للمعالجة الجغرافية
=====================================

ملف إعدادات شامل للـ worker مع قيم افتراضية آمنة
ودعم متغيرات البيئة للإنتاج.
"""

import os
from typing import Dict, Any

class WorkerConfig:
    """إعدادات Worker"""
    
    # Worker Identity
    WORKER_NAME = os.getenv('WORKER_NAME', 'geoprocessing-worker')
    WORKER_VERSION = '1.0.0'
    
    # Database Configuration
    DB_CONFIG = {
        'host': os.getenv('PGHOST', 'localhost'),
        'port': int(os.getenv('PGPORT', 5432)),
        'database': os.getenv('PGDATABASE', 'main'),
        'user': os.getenv('PGUSER', 'main'),
        'password': os.getenv('PGPASSWORD', ''),
        'sslmode': os.getenv('PGSSL', 'prefer'),
        'connect_timeout': 30,
        'command_timeout': 300,
    }
    
    # API Configuration
    API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:5000')
    WORKER_AUTH_TOKEN = os.getenv('WORKER_AUTH_TOKEN', 'worker-secret-token')
    API_TIMEOUT = int(os.getenv('API_TIMEOUT', 30))
    
    # Polling Configuration
    POLL_INTERVAL = int(os.getenv('POLL_INTERVAL', 5))  # seconds
    HEARTBEAT_INTERVAL = int(os.getenv('HEARTBEAT_INTERVAL', 30))  # seconds
    MAX_PROCESSING_TIME = int(os.getenv('MAX_PROCESSING_TIME', 3600))  # 1 hour
    MAX_RETRY_ATTEMPTS = int(os.getenv('MAX_RETRY_ATTEMPTS', 3))
    
    # File Processing Configuration
    MAX_FILE_SIZE = int(os.getenv('MAX_FILE_SIZE', 100 * 1024 * 1024))  # 100MB
    SUPPORTED_FORMATS = ['.tif', '.tiff', '.geotiff']
    OUTPUT_FORMATS = ['png', 'metadata', 'world_file']
    
    # Temporary Storage
    TEMP_DIR = os.getenv('TEMP_DIR', '/tmp')
    CLEANUP_TEMP_FILES = os.getenv('CLEANUP_TEMP_FILES', 'true').lower() == 'true'
    
    # Logging Configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    LOG_FILE = os.getenv('LOG_FILE', 'worker.log')
    LOG_MAX_SIZE = int(os.getenv('LOG_MAX_SIZE', 10 * 1024 * 1024))  # 10MB
    LOG_BACKUP_COUNT = int(os.getenv('LOG_BACKUP_COUNT', 5))
    
    # Performance Configuration
    CONCURRENT_JOBS = int(os.getenv('CONCURRENT_JOBS', 1))  # Number of jobs to process simultaneously
    MEMORY_LIMIT_MB = int(os.getenv('MEMORY_LIMIT_MB', 2048))  # 2GB
    CPU_CORES = int(os.getenv('CPU_CORES', 1))
    
    # Monitoring Configuration
    METRICS_ENABLED = os.getenv('METRICS_ENABLED', 'true').lower() == 'true'
    HEALTH_CHECK_PORT = int(os.getenv('HEALTH_CHECK_PORT', 8080))
    
    # Security Configuration
    VALIDATE_FILE_HEADERS = os.getenv('VALIDATE_FILE_HEADERS', 'true').lower() == 'true'
    SCAN_FOR_MALWARE = os.getenv('SCAN_FOR_MALWARE', 'false').lower() == 'true'
    
    @classmethod
    def get_database_url(cls) -> str:
        """إنشاء database URL من الإعدادات"""
        return (
            f"postgresql://{cls.DB_CONFIG['user']}:{cls.DB_CONFIG['password']}"
            f"@{cls.DB_CONFIG['host']}:{cls.DB_CONFIG['port']}/{cls.DB_CONFIG['database']}"
            f"?sslmode={cls.DB_CONFIG['sslmode']}"
        )
    
    @classmethod
    def validate_config(cls) -> Dict[str, Any]:
        """التحقق من صحة الإعدادات"""
        issues = []
        
        # Check required environment variables
        required_vars = ['PGHOST', 'PGDATABASE', 'PGUSER']
        for var in required_vars:
            if not os.getenv(var):
                issues.append(f"Missing required environment variable: {var}")
        
        # Check API connectivity requirements
        if not cls.API_BASE_URL:
            issues.append("API_BASE_URL is required")
        
        if not cls.WORKER_AUTH_TOKEN:
            issues.append("WORKER_AUTH_TOKEN is required for authentication")
        
        # Check file system permissions
        if not os.access(cls.TEMP_DIR, os.W_OK):
            issues.append(f"No write permission to temp directory: {cls.TEMP_DIR}")
        
        # Check resource limits
        if cls.MAX_FILE_SIZE < 1024 * 1024:  # 1MB minimum
            issues.append("MAX_FILE_SIZE too small (minimum 1MB)")
        
        if cls.CONCURRENT_JOBS < 1:
            issues.append("CONCURRENT_JOBS must be at least 1")
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'config_summary': {
                'worker_name': cls.WORKER_NAME,
                'api_url': cls.API_BASE_URL,
                'db_host': cls.DB_CONFIG['host'],
                'poll_interval': cls.POLL_INTERVAL,
                'max_file_size_mb': cls.MAX_FILE_SIZE // (1024 * 1024),
                'concurrent_jobs': cls.CONCURRENT_JOBS
            }
        }
    
    @classmethod
    def get_processing_config(cls) -> Dict[str, Any]:
        """إعدادات خاصة بالمعالجة"""
        return {
            'max_image_size': int(os.getenv('MAX_IMAGE_SIZE', 4096)),  # Max PNG dimensions
            'compression_quality': int(os.getenv('COMPRESSION_QUALITY', 85)),
            'preserve_transparency': os.getenv('PRESERVE_TRANSPARENCY', 'true').lower() == 'true',
            'generate_thumbnails': os.getenv('GENERATE_THUMBNAILS', 'true').lower() == 'true',
            'thumbnail_size': int(os.getenv('THUMBNAIL_SIZE', 256)),
            'coordinate_system': os.getenv('OUTPUT_CRS', 'EPSG:4326'),
            'include_statistics': os.getenv('INCLUDE_STATISTICS', 'true').lower() == 'true'
        }


# Global configuration instance
CONFIG = WorkerConfig()


def load_config_from_file(config_path: str) -> Dict[str, Any]:
    """تحميل إعدادات إضافية من ملف JSON"""
    import json
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in config file {config_path}: {e}")


def setup_logging():
    """إعداد نظام التسجيل"""
    import logging
    from logging.handlers import RotatingFileHandler
    
    # Create logger
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, CONFIG.LOG_LEVEL.upper()))
    
    # Clear existing handlers
    logger.handlers.clear()
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(CONFIG.LOG_FORMAT))
    logger.addHandler(console_handler)
    
    # File handler with rotation
    if CONFIG.LOG_FILE:
        file_handler = RotatingFileHandler(
            CONFIG.LOG_FILE,
            maxBytes=CONFIG.LOG_MAX_SIZE,
            backupCount=CONFIG.LOG_BACKUP_COUNT,
            encoding='utf-8'
        )
        file_handler.setFormatter(logging.Formatter(CONFIG.LOG_FORMAT))
        logger.addHandler(file_handler)
    
    return logger


if __name__ == '__main__':
    # Configuration validation
    validation = CONFIG.validate_config()
    
    print("=== Worker Configuration Validation ===")
    print(f"Valid: {validation['valid']}")
    
    if validation['issues']:
        print("\nIssues found:")
        for issue in validation['issues']:
            print(f"  - {issue}")
    
    print("\nConfiguration Summary:")
    for key, value in validation['config_summary'].items():
        print(f"  {key}: {value}")
    
    print(f"\nDatabase URL: {CONFIG.get_database_url()}")
    print(f"Processing Config: {CONFIG.get_processing_config()}")