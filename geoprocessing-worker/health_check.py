#!/usr/bin/env python3
"""
Health Check Script للـ Geoprocessing Worker
==========================================

يتحقق من صحة Worker والاتصالات المطلوبة
"""

import sys
import json
import psycopg2
import httpx
from datetime import datetime
from config import CONFIG


def check_database():
    """فحص اتصال قاعدة البيانات"""
    try:
        conn = psycopg2.connect(**CONFIG.DB_CONFIG)
        cursor = conn.cursor()
        
        # Test basic query
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        
        # Check if geo_jobs table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'geo_jobs'
            );
        """)
        geo_jobs_exists = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return {
            'status': 'healthy',
            'response_time_ms': 0,  # Could measure this
            'geo_jobs_table_exists': geo_jobs_exists,
            'message': 'Database connection successful'
        }
        
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'message': 'Database connection failed'
        }


def check_api():
    """فحص اتصال API"""
    try:
        client = httpx.Client(timeout=10.0)
        
        # Test general API health
        response = client.get(f"{CONFIG.API_BASE_URL}/health")
        api_health = {
            'status_code': response.status_code,
            'response_time_ms': int(response.elapsed.total_seconds() * 1000)
        }
        
        # Test worker-specific endpoint
        worker_response = client.post(
            f"{CONFIG.API_BASE_URL}/api/internal/geo-jobs/claim",
            json={'workerId': 'health-check-worker'},
            headers={'Authorization': f'Worker {CONFIG.WORKER_AUTH_TOKEN}'}
        )
        
        worker_health = {
            'status_code': worker_response.status_code,
            'can_claim_jobs': worker_response.status_code in [200, 404]  # 404 is okay (no jobs)
        }
        
        client.close()
        
        overall_status = 'healthy' if (
            api_health['status_code'] == 200 and 
            worker_health['can_claim_jobs']
        ) else 'unhealthy'
        
        return {
            'status': overall_status,
            'api_health': api_health,
            'worker_endpoints': worker_health,
            'message': 'API connection successful' if overall_status == 'healthy' else 'API connection issues'
        }
        
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'message': 'API connection failed'
        }


def check_file_system():
    """فحص نظام الملفات"""
    import os
    import tempfile
    
    try:
        # Check temp directory
        temp_accessible = os.access(CONFIG.TEMP_DIR, os.W_OK)
        
        # Test file creation
        with tempfile.NamedTemporaryFile(dir=CONFIG.TEMP_DIR, delete=True) as f:
            f.write(b"health check test")
            temp_file_creation = True
        
        # Check disk space (basic)
        statvfs = os.statvfs(CONFIG.TEMP_DIR)
        free_space_mb = (statvfs.f_frsize * statvfs.f_bavail) // (1024 * 1024)
        
        status = 'healthy' if temp_accessible and temp_file_creation else 'unhealthy'
        
        return {
            'status': status,
            'temp_dir': CONFIG.TEMP_DIR,
            'temp_accessible': temp_accessible,
            'file_creation_test': temp_file_creation,
            'free_space_mb': free_space_mb,
            'message': 'File system accessible' if status == 'healthy' else 'File system issues'
        }
        
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'message': 'File system check failed'
        }


def check_dependencies():
    """فحص المكتبات المطلوبة"""
    try:
        import rasterio
        import numpy
        import PIL
        
        # Test basic functionality
        numpy_version = numpy.__version__
        rasterio_version = rasterio.__version__
        pil_version = PIL.__version__
        
        # Test if GDAL is accessible through rasterio
        gdal_available = True
        try:
            import rasterio.env
            with rasterio.env.Env():
                pass
        except:
            gdal_available = False
        
        return {
            'status': 'healthy',
            'versions': {
                'numpy': numpy_version,
                'rasterio': rasterio_version,
                'pillow': pil_version
            },
            'gdal_available': gdal_available,
            'message': 'All dependencies available'
        }
        
    except ImportError as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'message': 'Missing required dependencies'
        }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'message': 'Dependency check failed'
        }


def run_health_check():
    """تشغيل فحص صحة شامل"""
    print(f"🏥 Health Check - {datetime.now().isoformat()}")
    print("=" * 50)
    
    checks = {
        'database': check_database(),
        'api': check_api(),
        'file_system': check_file_system(),
        'dependencies': check_dependencies()
    }
    
    overall_healthy = all(check['status'] == 'healthy' for check in checks.values())
    
    # Print results
    for check_name, result in checks.items():
        status_emoji = "✅" if result['status'] == 'healthy' else "❌"
        print(f"{status_emoji} {check_name.title()}: {result['message']}")
        
        if result['status'] == 'unhealthy' and 'error' in result:
            print(f"   Error: {result['error']}")
    
    print("\n" + "=" * 50)
    
    if overall_healthy:
        print("🎉 Overall Status: HEALTHY - Worker is ready to process jobs")
        return 0
    else:
        print("⚠️  Overall Status: UNHEALTHY - Worker may not function properly")
        
        # Detailed output for debugging
        print("\nDetailed Results:")
        print(json.dumps(checks, indent=2, default=str))
        return 1


if __name__ == '__main__':
    exit_code = run_health_check()
    sys.exit(exit_code)