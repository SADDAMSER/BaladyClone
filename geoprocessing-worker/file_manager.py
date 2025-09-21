#!/usr/bin/env python3
"""
File Manager للـ Geoprocessing Worker
===================================

يدير تحميل ورفع الملفات مع Object Storage
مع دعم signed URLs وvalidation شامل.
"""

import os
import json
import uuid
import mimetypes
import tempfile
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path

import httpx
import logging

logger = logging.getLogger('file-manager')


class FileManager:
    """
    مدير الملفات للـ Worker
    
    يتعامل مع:
    - تحميل ملفات من Object Storage
    - رفع ملفات إلى Object Storage
    - Validation للملفات
    - Cleanup للملفات المؤقتة
    """
    
    def __init__(self, api_base_url: str, auth_token: str):
        self.api_base_url = api_base_url
        self.auth_token = auth_token
        self.http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(120.0),  # Longer timeout for file operations
            headers={'Authorization': f'Worker {auth_token}'}
        )
        
        # File validation settings
        self.max_file_size = 100 * 1024 * 1024  # 100MB
        self.allowed_extensions = ['.tif', '.tiff', '.geotiff', '.zip', '.geojson', '.json']
        self.allowed_mime_types = [
            'image/tiff',
            'application/octet-stream',
            'application/x-zip-compressed',
            'application/zip',
            'application/json'
        ]
        
        logger.info(f"FileManager initialized with API: {api_base_url}")
    
    async def download_job_input_files(self, job_id: str) -> List[Dict[str, Any]]:
        """
        تحميل جميع input files للـ job
        
        Returns:
            List of file info dictionaries with local paths
        """
        try:
            # Get download URLs from API
            response = await self.http_client.get(
                f"{self.api_base_url}/api/geo-jobs/{job_id}/download/input"
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to get download URLs: {response.status_code} - {response.text}")
            
            data = response.json()
            files_info = data.get('data', {}).get('files', [])
            
            if not files_info:
                logger.warning(f"No input files found for job {job_id}")
                return []
            
            downloaded_files = []
            
            # Create temp directory for this job
            temp_dir = tempfile.mkdtemp(prefix=f"geojob_{job_id}_input_")
            logger.info(f"Created temp directory: {temp_dir}")
            
            for file_info in files_info:
                if 'error' in file_info:
                    logger.error(f"Error with file {file_info.get('fileName', 'unknown')}: {file_info['error']}")
                    continue
                
                try:
                    file_name = file_info['fileName']
                    download_url = file_info['downloadUrl']
                    local_path = os.path.join(temp_dir, file_name)
                    
                    # Download file
                    logger.info(f"Downloading {file_name}...")
                    await self._download_file_from_url(download_url, local_path)
                    
                    # Validate downloaded file
                    validation = self._validate_downloaded_file(local_path)
                    if not validation['valid']:
                        logger.error(f"Downloaded file validation failed: {validation}")
                        continue
                    
                    downloaded_files.append({
                        'file_name': file_name,
                        'local_path': local_path,
                        'file_key': file_info['fileKey'],
                        'file_size': os.path.getsize(local_path),
                        'validation': validation
                    })
                    
                    logger.info(f"Successfully downloaded: {file_name} -> {local_path}")
                    
                except Exception as e:
                    logger.error(f"Failed to download {file_info.get('fileName', 'unknown')}: {e}")
                    continue
            
            logger.info(f"Downloaded {len(downloaded_files)} files for job {job_id}")
            return downloaded_files
            
        except Exception as e:
            logger.error(f"Error downloading input files for job {job_id}: {e}")
            raise
    
    async def _download_file_from_url(self, url: str, local_path: str):
        """تحميل ملف من URL إلى مسار محلي"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            
            # Download with streaming
            async with self.http_client.stream('GET', url) as response:
                if response.status_code != 200:
                    raise Exception(f"Download failed with status {response.status_code}")
                
                total_size = 0
                with open(local_path, 'wb') as f:
                    async for chunk in response.aiter_bytes(chunk_size=8192):
                        f.write(chunk)
                        total_size += len(chunk)
                        
                        # Check size limit
                        if total_size > self.max_file_size:
                            raise Exception(f"File size exceeds limit: {total_size} > {self.max_file_size}")
                
                logger.debug(f"Downloaded {total_size} bytes to {local_path}")
                
        except Exception as e:
            # Cleanup partial download
            if os.path.exists(local_path):
                try:
                    os.unlink(local_path)
                except:
                    pass
            raise Exception(f"Download failed: {e}")
    
    def _validate_downloaded_file(self, file_path: str) -> Dict[str, Any]:
        """التحقق من صحة الملف المحمل"""
        try:
            if not os.path.exists(file_path):
                return {'valid': False, 'error': 'File does not exist'}
            
            file_size = os.path.getsize(file_path)
            if file_size == 0:
                return {'valid': False, 'error': 'File is empty'}
            
            if file_size > self.max_file_size:
                return {'valid': False, 'error': f'File too large: {file_size} > {self.max_file_size}'}
            
            # Check extension
            file_extension = Path(file_path).suffix.lower()
            if file_extension not in self.allowed_extensions:
                return {'valid': False, 'error': f'Invalid extension: {file_extension}'}
            
            # Check MIME type
            mime_type, _ = mimetypes.guess_type(file_path)
            if mime_type and mime_type not in self.allowed_mime_types:
                logger.warning(f"Unknown MIME type: {mime_type} for {file_path}")
            
            # Additional validation for GeoTIFF files
            if file_extension in ['.tif', '.tiff', '.geotiff']:
                try:
                    import rasterio
                    with rasterio.open(file_path) as dataset:
                        # Basic rasterio validation
                        if dataset.width <= 0 or dataset.height <= 0:
                            return {'valid': False, 'error': 'Invalid raster dimensions'}
                except Exception as e:
                    return {'valid': False, 'error': f'Invalid GeoTIFF file: {str(e)}'}
            
            return {
                'valid': True,
                'file_size': file_size,
                'mime_type': mime_type,
                'extension': file_extension
            }
            
        except Exception as e:
            return {'valid': False, 'error': f'Validation failed: {str(e)}'}
    
    async def upload_job_output_files(self, job_id: str, output_files: List[str]) -> List[str]:
        """
        رفع output files للـ job إلى Object Storage
        
        Returns:
            List of uploaded file keys
        """
        uploaded_keys = []
        
        for file_path in output_files:
            try:
                if not os.path.exists(file_path):
                    logger.error(f"Output file not found: {file_path}")
                    continue
                
                file_name = os.path.basename(file_path)
                file_size = os.path.getsize(file_path)
                
                # Determine content type
                content_type = self._get_content_type(file_path)
                
                # Generate unique file key
                file_key = f"geo-jobs/{job_id}/output/{uuid.uuid4().hex}-{file_name}"
                
                # Get upload URL from API
                upload_info = await self._get_upload_url(file_key, file_name, file_size, content_type)
                
                if upload_info:
                    # Upload file
                    success = await self._upload_file_to_url(
                        file_path, 
                        upload_info['uploadUrl'], 
                        content_type
                    )
                    
                    if success:
                        uploaded_keys.append(file_key)
                        logger.info(f"Successfully uploaded: {file_name} -> {file_key}")
                    else:
                        logger.error(f"Failed to upload file: {file_name}")
                else:
                    logger.error(f"Failed to get upload URL for: {file_name}")
                
            except Exception as e:
                logger.error(f"Error uploading {file_path}: {e}")
        
        logger.info(f"Uploaded {len(uploaded_keys)} output files for job {job_id}")
        return uploaded_keys
    
    async def _get_upload_url(self, file_key: str, file_name: str, file_size: int, content_type: str) -> Optional[Dict[str, Any]]:
        """الحصول على upload URL من API"""
        try:
            # Note: This would need a new endpoint for worker file uploads
            # For now, we'll simulate the expected response structure
            
            # In a real implementation, this would call:
            # POST /api/internal/geo-jobs/upload-url
            # with file metadata to get signed upload URL
            
            # Simulated response for now:
            logger.warning(f"Upload URL simulation for {file_name} - implement actual endpoint")
            
            return {
                'uploadUrl': f"https://simulated-upload-url.com/upload/{file_key}",
                'fileKey': file_key,
                'expiresIn': 300
            }
            
        except Exception as e:
            logger.error(f"Failed to get upload URL: {e}")
            return None
    
    async def _upload_file_to_url(self, file_path: str, upload_url: str, content_type: str) -> bool:
        """رفع ملف إلى signed URL"""
        try:
            # For now, we'll simulate successful upload
            # In real implementation, this would:
            # 1. Read file content
            # 2. PUT to signed URL with proper headers
            # 3. Handle response and retries
            
            file_size = os.path.getsize(file_path)
            logger.info(f"Simulated upload: {os.path.basename(file_path)} ({file_size} bytes) to {upload_url}")
            
            # Real implementation would be:
            # with open(file_path, 'rb') as f:
            #     response = await self.http_client.put(
            #         upload_url, 
            #         content=f.read(),
            #         headers={'Content-Type': content_type}
            #     )
            #     return response.status_code == 200
            
            return True  # Simulated success
            
        except Exception as e:
            logger.error(f"Upload failed: {e}")
            return False
    
    def _get_content_type(self, file_path: str) -> str:
        """تحديد content type للملف"""
        mime_type, _ = mimetypes.guess_type(file_path)
        
        if mime_type:
            return mime_type
        
        # Fallback based on extension
        extension = Path(file_path).suffix.lower()
        content_types = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.json': 'application/json',
            '.txt': 'text/plain',
            '.pgw': 'text/plain',
            '.tif': 'image/tiff',
            '.tiff': 'image/tiff'
        }
        
        return content_types.get(extension, 'application/octet-stream')
    
    def cleanup_temp_files(self, file_infos: List[Dict[str, Any]]):
        """تنظيف الملفات المؤقتة"""
        temp_dirs = set()
        
        for file_info in file_infos:
            file_path = file_info.get('local_path')
            if file_path and os.path.exists(file_path):
                try:
                    temp_dirs.add(os.path.dirname(file_path))
                    os.unlink(file_path)
                    logger.debug(f"Cleaned up file: {file_path}")
                except Exception as e:
                    logger.warning(f"Failed to cleanup file {file_path}: {e}")
        
        # Remove empty temp directories
        for temp_dir in temp_dirs:
            try:
                if os.path.exists(temp_dir) and not os.listdir(temp_dir):
                    os.rmdir(temp_dir)
                    logger.debug(f"Cleaned up directory: {temp_dir}")
            except Exception as e:
                logger.warning(f"Failed to cleanup directory {temp_dir}: {e}")
    
    async def close(self):
        """إغلاق File Manager وtقنيف الموارد"""
        await self.http_client.aclose()


# Example usage
if __name__ == '__main__':
    import asyncio
    
    async def test_file_manager():
        file_manager = FileManager('http://localhost:5000', 'test-token')
        
        # Test validation
        test_file = 'test.txt'
        with open(test_file, 'w') as f:
            f.write('test content')
        
        validation = file_manager._validate_downloaded_file(test_file)
        print(f"Validation result: {validation}")
        
        # Cleanup
        os.unlink(test_file)
        await file_manager.close()
    
    asyncio.run(test_file_manager())