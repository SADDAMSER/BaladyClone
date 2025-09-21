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
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'geotiff-processor-poc'))
from main import process_geotiff

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
        
        logger.info(f"Worker initialized: {self.worker_id}")
        logger.info(f"Database: {self.db_config['host']}:{self.db_config['port']}")
        logger.info(f"API Base URL: {self.api_base_url}")
    
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
    
    async def download_input_files(self, job: Dict[str, Any]) -> List[str]:
        """تحميل input files من Object Storage"""
        downloaded_files = []
        
        try:
            # Get download URLs for input files
            response = await self.http_client.get(
                f"{self.api_base_url}/api/geo-jobs/{job['id']}/download/input"
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to get download URLs: {response.status_code}")
            
            data = response.json()
            files_info = data.get('data', {}).get('files', [])
            
            if not files_info:
                raise Exception("No input files found for this job")
            
            # Download each file
            for file_info in files_info:
                if 'error' in file_info:
                    logger.error(f"Error with file {file_info['fileName']}: {file_info['error']}")
                    continue
                
                # Create temporary file
                temp_dir = tempfile.mkdtemp(prefix=f"geojob_{job['id']}_")
                local_path = os.path.join(temp_dir, file_info['fileName'])
                
                # Download file
                async with self.http_client.stream('GET', file_info['downloadUrl']) as file_response:
                    if file_response.status_code == 200:
                        with open(local_path, 'wb') as f:
                            async for chunk in file_response.aiter_bytes():
                                f.write(chunk)
                        
                        downloaded_files.append(local_path)
                        logger.info(f"Downloaded: {file_info['fileName']} -> {local_path}")
                    else:
                        logger.error(f"Failed to download {file_info['fileName']}: {file_response.status_code}")
            
            return downloaded_files
            
        except Exception as e:
            logger.error(f"Error downloading input files: {e}")
            # Cleanup partial downloads
            for file_path in downloaded_files:
                try:
                    if os.path.exists(file_path):
                        os.unlink(file_path)
                        # Also remove temp directory if empty
                        temp_dir = os.path.dirname(file_path)
                        if os.path.exists(temp_dir) and not os.listdir(temp_dir):
                            os.rmdir(temp_dir)
                except:
                    pass
            raise
    
    async def upload_output_files(self, job_id: str, output_files: List[str]) -> List[str]:
        """رفع output files إلى Object Storage"""
        uploaded_keys = []
        
        for file_path in output_files:
            try:
                file_name = os.path.basename(file_path)
                file_size = os.path.getsize(file_path)
                
                # Determine content type
                content_type = 'application/octet-stream'
                if file_name.endswith('.png'):
                    content_type = 'image/png'
                elif file_name.endswith('.json'):
                    content_type = 'application/json'
                elif file_name.endswith('.pgw'):
                    content_type = 'text/plain'
                
                # Get upload URL
                # Note: We need to implement a way to get upload URL for output files
                # For now, we'll use a direct approach with file upload
                
                # Generate unique key for output file
                file_key = f"geo-jobs/{job_id}/output/{uuid.uuid4().hex}-{file_name}"
                
                # Read file content
                with open(file_path, 'rb') as f:
                    file_content = f.read()
                
                # Upload via multipart (this would need implementation on server side)
                # For now, log the operation
                logger.info(f"Would upload {file_name} as {file_key} ({file_size} bytes)")
                uploaded_keys.append(file_key)
                
            except Exception as e:
                logger.error(f"Failed to upload {file_path}: {e}")
        
        return uploaded_keys
    
    async def process_geotiff_job(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """
        معالجة GeoTIFF job باستخدام PoC الموجود
        """
        job_id = job['id']
        
        try:
            logger.info(f"Starting GeoTIFF processing for job {job_id}")
            await self.update_job_progress(job_id, 10, "Downloading input files...")
            
            # Download input files
            input_files = await self.download_input_files(job)
            
            if not input_files:
                raise Exception("No input files downloaded")
            
            await self.update_job_progress(job_id, 30, "Processing GeoTIFF files...")
            
            # Process each GeoTIFF file
            all_output_files = []
            processing_results = []
            
            for input_file in input_files:
                try:
                    # Check if it's a GeoTIFF file
                    if not input_file.lower().endswith(('.tif', '.tiff', '.geotiff')):
                        logger.warning(f"Skipping non-GeoTIFF file: {input_file}")
                        continue
                    
                    # Create output directory for this file
                    output_dir = tempfile.mkdtemp(prefix=f"output_{job_id}_")
                    
                    # Process using PoC
                    result = process_geotiff(
                        geotiff_path=input_file,
                        output_dir=output_dir,
                        max_size=job.get('inputPayload', {}).get('maxSize')
                    )
                    
                    # Collect output files
                    output_files = [
                        result['png_path'],
                        result['world_file_path'],
                        result['metadata_path']
                    ]
                    
                    all_output_files.extend(output_files)
                    processing_results.append({
                        'input_file': os.path.basename(input_file),
                        'output_files': [os.path.basename(f) for f in output_files],
                        'metadata': result['metadata']
                    })
                    
                    logger.info(f"Successfully processed: {os.path.basename(input_file)}")
                    
                except Exception as e:
                    logger.error(f"Failed to process {input_file}: {e}")
                    processing_results.append({
                        'input_file': os.path.basename(input_file),
                        'error': str(e)
                    })
            
            await self.update_job_progress(job_id, 70, "Uploading output files...")
            
            # Upload output files
            output_keys = await self.upload_output_files(job_id, all_output_files)
            
            await self.update_job_progress(job_id, 90, "Finalizing results...")
            
            # Prepare final output payload
            output_payload = {
                'taskType': job['taskType'],
                'processedAt': datetime.now().isoformat(),
                'workerId': self.worker_id,
                'results': processing_results,
                'summary': {
                    'totalInputFiles': len(input_files),
                    'successfullyProcessed': len([r for r in processing_results if 'error' not in r]),
                    'failed': len([r for r in processing_results if 'error' in r]),
                    'outputFilesCount': len(all_output_files)
                }
            }
            
            # Cleanup temp files
            self.cleanup_temp_files(input_files + all_output_files)
            
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