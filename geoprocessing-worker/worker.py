#!/usr/bin/env python3
"""
منصة بناء اليمن - Python Geoprocessing Worker
=================================================

Worker مختص بمعالجة ملفات GeoTIFF باستخدام database polling pattern
مع دعم SKIP LOCKED وheartbeat mechanism للمراقبة والأمان.

المعالجة المدعومة:
- تحويل GeoTIFF إلى PNG
- استخراج البيانات الوصفية
- إنشاء World Files للإسناد الجغرافي
- رفع النتائج إلى Object Storage
"""

import os
import sys
import time
import json
import uuid
import logging
import asyncio
import tempfile
import traceback
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List

import httpx
import psycopg2
import psycopg2.extras
from psycopg2 import sql

# Import processing modules
from processor import create_processor
from file_manager import FileManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('worker.log')
    ]
)
logger = logging.getLogger('geoprocessing-worker')

class GeoprocessingWorker:
    """
    Worker رئيسي لمعالجة GeoTIFF files
    
    يستعلم عن قاعدة البيانات للحصول على jobs جديدة،
    يعالج الملفات باستخدام PoC الموجود،
    ويرفع النتائج إلى Object Storage.
    """
    
    def __init__(self):
        self.worker_id = f"worker-{uuid.uuid4().hex[:8]}"
        self.running = False
        self.current_job_id = None
        
        # Database configuration
        self.db_config = {
            'host': os.getenv('PGHOST', 'localhost'),
            'port': int(os.getenv('PGPORT', 5432)),
            'database': os.getenv('PGDATABASE', 'main'),
            'user': os.getenv('PGUSER', 'main'),
            'password': os.getenv('PGPASSWORD', ''),
        }
        
        # API configuration
        self.api_base_url = os.getenv('API_BASE_URL', 'http://localhost:5000')
        self.worker_auth_token = os.getenv('WORKER_AUTH_TOKEN', 'worker-secret-token')
        
        # Polling configuration
        self.poll_interval = int(os.getenv('POLL_INTERVAL', 5))  # seconds
        self.heartbeat_interval = int(os.getenv('HEARTBEAT_INTERVAL', 30))  # seconds
        self.max_processing_time = int(os.getenv('MAX_PROCESSING_TIME', 3600))  # 1 hour
        
        # HTTP client for API calls
        self.http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            headers={'Authorization': f'Worker {self.worker_auth_token}'}
        )
        
        # Initialize specialized components
        self.file_manager = FileManager(self.api_base_url, self.worker_auth_token)
        
        # Processor configuration
        processing_config = {
            'max_image_size': int(os.getenv('MAX_IMAGE_SIZE', 4096)),
            'compression_quality': int(os.getenv('COMPRESSION_QUALITY', 85)),
            'generate_thumbnails': os.getenv('GENERATE_THUMBNAILS', 'true').lower() == 'true',
            'thumbnail_size': int(os.getenv('THUMBNAIL_SIZE', 256)),
            'include_statistics': os.getenv('INCLUDE_STATISTICS', 'true').lower() == 'true'
        }
        self.processor = create_processor(processing_config)
        
        logger.info(f"Worker initialized: {self.worker_id}")
        logger.info(f"Database: {self.db_config['host']}:{self.db_config['port']}")
        logger.info(f"API Base URL: {self.api_base_url}")
        logger.info(f"Processing config: {processing_config}")
    
    async def get_database_connection(self):
        """إنشاء اتصال بقاعدة البيانات"""
        try:
            conn = psycopg2.connect(**self.db_config)
            conn.autocommit = True
            return conn
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    async def claim_next_job(self) -> Optional[Dict[str, Any]]:
        """
        طلب job جديد من API باستخدام SKIP LOCKED pattern
        """
        try:
            response = await self.http_client.post(
                f"{self.api_base_url}/api/internal/geo-jobs/claim",
                json={'workerId': self.worker_id}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('data', {}).get('job'):
                    job = data['data']['job']
                    logger.info(f"Claimed job: {job['id']} - {job['taskType']}")
                    return job
                else:
                    logger.debug("No jobs available")
                    return None
            else:
                logger.error(f"Failed to claim job: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error claiming job: {e}")
            return None
    
    async def update_job_progress(self, job_id: str, progress: int, message: str = ""):
        """تحديث progress الخاص بـ job"""
        try:
            response = await self.http_client.patch(
                f"{self.api_base_url}/api/internal/geo-jobs/{job_id}/progress",
                json={
                    'progress': progress,
                    'message': message,
                    'workerId': self.worker_id
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to update progress: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error updating job progress: {e}")
    
    async def send_heartbeat(self, job_id: str):
        """إرسال heartbeat للـ job"""
        try:
            response = await self.http_client.patch(
                f"{self.api_base_url}/api/internal/geo-jobs/{job_id}/heartbeat",
                json={'workerId': self.worker_id}
            )
            
            if response.status_code == 200:
                logger.debug(f"Heartbeat sent for job {job_id}")
            else:
                logger.error(f"Failed to send heartbeat: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error sending heartbeat: {e}")
    
    async def complete_job(self, job_id: str, output_payload: Dict[str, Any], output_keys: List[str]):
        """تمييز job كمكتمل"""
        try:
            response = await self.http_client.patch(
                f"{self.api_base_url}/api/internal/geo-jobs/{job_id}/complete",
                json={
                    'outputPayload': output_payload,
                    'outputKeys': output_keys
                }
            )
            
            if response.status_code == 200:
                logger.info(f"Job {job_id} completed successfully")
                return True
            else:
                logger.error(f"Failed to complete job: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error completing job: {e}")
            return False
    
    async def fail_job(self, job_id: str, error_info: Dict[str, Any]):
        """تمييز job كفاشل"""
        try:
            response = await self.http_client.patch(
                f"{self.api_base_url}/api/internal/geo-jobs/{job_id}/fail",
                json={'error': error_info}
            )
            
            if response.status_code == 200:
                logger.info(f"Job {job_id} marked as failed")
                return True
            else:
                logger.error(f"Failed to mark job as failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error failing job: {e}")
            return False
    
    async def download_input_files(self, job: Dict[str, Any]) -> List[Dict[str, Any]]:
        """تحميل input files من Object Storage باستخدام FileManager"""
        try:
            return await self.file_manager.download_job_input_files(job['id'])
        except Exception as e:
            logger.error(f"Error downloading input files: {e}")
            raise
    
    async def upload_output_files(self, job_id: str, output_files: List[str]) -> List[str]:
        """رفع output files إلى Object Storage باستخدام FileManager"""
        try:
            return await self.file_manager.upload_job_output_files(job_id, output_files)
        except Exception as e:
            logger.error(f"Error uploading output files: {e}")
            return []
    
    async def process_geotiff_job(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """
        معالجة GeoTIFF job باستخدام Processor المحدث
        """
        job_id = job['id']
        
        try:
            logger.info(f"Starting GeoTIFF processing for job {job_id}")
            await self.update_job_progress(job_id, 10, "Downloading input files...")
            
            # Download input files using FileManager
            input_file_infos = await self.download_input_files(job)
            
            if not input_file_infos:
                raise Exception("No input files downloaded")
            
            await self.update_job_progress(job_id, 30, "Processing GeoTIFF files...")
            
            # Extract file paths for GeoTIFF files
            geotiff_files = []
            for file_info in input_file_infos:
                file_path = file_info['local_path']
                if file_path.lower().endswith(('.tif', '.tiff', '.geotiff')):
                    geotiff_files.append(file_path)
                else:
                    logger.warning(f"Skipping non-GeoTIFF file: {file_info['file_name']}")
            
            if not geotiff_files:
                raise Exception("No GeoTIFF files found in input")
            
            # Create output directory
            output_base_dir = tempfile.mkdtemp(prefix=f"output_{job_id}_")
            
            # Process using enhanced processor
            job_config = job.get('inputPayload', {})
            batch_result = self.processor.batch_process_files(
                geotiff_files, 
                output_base_dir, 
                job_config
            )
            
            await self.update_job_progress(job_id, 70, "Uploading output files...")
            
            # Collect all output files
            all_output_files = []
            for file_name, file_result in batch_result['files'].items():
                if 'output_files' in file_result:
                    for output_type, output_path in file_result['output_files'].items():
                        all_output_files.append(output_path)
            
            # Upload output files using FileManager
            output_keys = await self.upload_output_files(job_id, all_output_files)
            
            await self.update_job_progress(job_id, 90, "Finalizing results...")
            
            # Prepare enhanced output payload
            output_payload = {
                'taskType': job['taskType'],
                'processedAt': datetime.now().isoformat(),
                'workerId': self.worker_id,
                'processingResults': batch_result,
                'summary': {
                    'totalInputFiles': len(input_file_infos),
                    'geotiffFiles': len(geotiff_files),
                    'successfullyProcessed': batch_result['summary']['successful'],
                    'failed': batch_result['summary']['failed'],
                    'totalOutputFiles': batch_result['summary']['total_output_files'],
                    'uploadedFiles': len(output_keys)
                },
                'inputValidation': [file_info.get('validation', {}) for file_info in input_file_infos]
            }
            
            # Cleanup temp files using FileManager
            self.file_manager.cleanup_temp_files(input_file_infos)
            self.cleanup_temp_files(all_output_files)
            
            return {
                'output_payload': output_payload,
                'output_keys': output_keys
            }
            
        except Exception as e:
            logger.error(f"Error processing GeoTIFF job: {e}")
            logger.error(traceback.format_exc())
            raise
    
    def cleanup_temp_files(self, file_paths: List[str]):
        """تنظيف الملفات المؤقتة"""
        temp_dirs = set()
        
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    temp_dirs.add(os.path.dirname(file_path))
                    os.unlink(file_path)
            except Exception as e:
                logger.warning(f"Failed to cleanup {file_path}: {e}")
        
        # Remove empty temp directories
        for temp_dir in temp_dirs:
            try:
                if os.path.exists(temp_dir) and not os.listdir(temp_dir):
                    os.rmdir(temp_dir)
            except Exception as e:
                logger.warning(f"Failed to cleanup directory {temp_dir}: {e}")
    
    async def process_job(self, job: Dict[str, Any]) -> bool:
        """
        معالجة job واحد
        """
        job_id = job['id']
        task_type = job['taskType']
        
        self.current_job_id = job_id
        start_time = datetime.now()
        
        # Start heartbeat task
        heartbeat_task = asyncio.create_task(self.heartbeat_loop(job_id))
        
        try:
            logger.info(f"Processing job {job_id} - {task_type}")
            
            # Route to appropriate processor
            if task_type == 'geotiff_to_png':
                result = await self.process_geotiff_job(job)
            else:
                raise Exception(f"Unsupported task type: {task_type}")
            
            # Complete the job
            success = await self.complete_job(
                job_id,
                result['output_payload'],
                result['output_keys']
            )
            
            if success:
                processing_time = (datetime.now() - start_time).total_seconds()
                logger.info(f"Job {job_id} completed in {processing_time:.2f} seconds")
                return True
            else:
                logger.error(f"Failed to mark job {job_id} as completed")
                return False
            
        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}")
            logger.error(traceback.format_exc())
            
            # Mark job as failed
            error_info = {
                'error': str(e),
                'traceback': traceback.format_exc(),
                'workerId': self.worker_id,
                'failedAt': datetime.now().isoformat()
            }
            
            await self.fail_job(job_id, error_info)
            return False
            
        finally:
            # Stop heartbeat
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass
            
            self.current_job_id = None
    
    async def heartbeat_loop(self, job_id: str):
        """
        إرسال heartbeat بشكل دوري
        """
        try:
            while True:
                await asyncio.sleep(self.heartbeat_interval)
                await self.send_heartbeat(job_id)
        except asyncio.CancelledError:
            logger.debug(f"Heartbeat loop cancelled for job {job_id}")
    
    async def run(self):
        """
        تشغيل Worker الرئيسي
        """
        self.running = True
        logger.info(f"Worker {self.worker_id} starting...")
        
        while self.running:
            try:
                # Try to claim a job
                job = await self.claim_next_job()
                
                if job:
                    # Process the job
                    await self.process_job(job)
                else:
                    # No jobs available, wait before polling again
                    await asyncio.sleep(self.poll_interval)
                
            except KeyboardInterrupt:
                logger.info("Received interrupt signal, shutting down...")
                self.running = False
                break
            except Exception as e:
                logger.error(f"Unexpected error in main loop: {e}")
                logger.error(traceback.format_exc())
                await asyncio.sleep(self.poll_interval * 2)  # Back off on errors
        
        logger.info("Worker shutdown complete")
    
    async def shutdown(self):
        """إيقاف Worker بأمان"""
        self.running = False
        await self.http_client.aclose()
        await self.file_manager.close()


async def main():
    """نقطة الدخول الرئيسية"""
    worker = GeoprocessingWorker()
    
    try:
        await worker.run()
    except KeyboardInterrupt:
        logger.info("Shutdown requested")
    finally:
        await worker.shutdown()


if __name__ == '__main__':
    asyncio.run(main())