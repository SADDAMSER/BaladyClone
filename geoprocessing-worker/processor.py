#!/usr/bin/env python3
"""
Geoprocessing Processor Module
==============================

وحدة معالجة متخصصة تدمج PoC الموجود مع Worker system
مع إضافة features متقدمة للمعالجة الجغرافية.
"""

import os
import sys
import json
import tempfile
import traceback
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import rasterio
import numpy as np
from PIL import Image
from rasterio.warp import transform_bounds
from rasterio.crs import CRS

# Import PoC functions
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'geotiff-processor-poc'))
from main import process_geotiff, extract_metadata, convert_to_png, create_world_file

import logging
logger = logging.getLogger('geoprocessing-processor')


class GeoprocessingProcessor:
    """
    معالج متخصص للملفات الجغرافية
    
    يوفر واجهة محسّنة لمعالجة GeoTIFF مع دعم:
    - Multiple output formats
    - Advanced processing options
    - Quality control
    - Statistics generation
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.max_image_size = self.config.get('max_image_size', 4096)
        self.compression_quality = self.config.get('compression_quality', 85)
        self.generate_thumbnails = self.config.get('generate_thumbnails', True)
        self.thumbnail_size = self.config.get('thumbnail_size', 256)
        self.include_statistics = self.config.get('include_statistics', True)
        
        logger.info(f"Processor initialized with config: {self.config}")
    
    def _transform_bounds_to_wgs84(self, dataset) -> Optional[List[float]]:
        """
        تحويل bounds من نظام الإحداثيات الأصلي إلى WGS84 (EPSG:4326)
        للاستخدام مع Leaflet maps
        
        Returns: [west, south, east, north] - leaflet bounds format
        """
        try:
            if not dataset.crs or not dataset.bounds:
                return None
                
            # Check if already in WGS84
            if dataset.crs.to_epsg() == 4326:
                bounds = dataset.bounds
                return [float(bounds.left), float(bounds.bottom), 
                       float(bounds.right), float(bounds.top)]
            
            # Transform bounds to WGS84
            wgs84_bounds = transform_bounds(
                dataset.crs,
                CRS.from_epsg(4326),  # WGS84
                dataset.bounds.left,
                dataset.bounds.bottom,
                dataset.bounds.right,
                dataset.bounds.top
            )
            
            # Return in [west, south, east, north] format for Leaflet
            return [float(wgs84_bounds[0]), float(wgs84_bounds[1]),
                   float(wgs84_bounds[2]), float(wgs84_bounds[3])]
            
        except Exception as e:
            logger.warning(f"Failed to transform bounds to WGS84: {e}")
            return None
    
    def validate_geotiff_file(self, file_path: str) -> Dict[str, Any]:
        """
        التحقق من صحة ملف GeoTIFF قبل المعالجة
        """
        try:
            with rasterio.open(file_path) as dataset:
                validation = {
                    'valid': True,
                    'file_size_mb': os.path.getsize(file_path) / (1024 * 1024),
                    'dimensions': (dataset.width, dataset.height),
                    'bands': dataset.count,
                    'data_type': str(dataset.dtypes[0]),
                    'has_crs': dataset.crs is not None,
                    'has_transform': dataset.transform is not None,
                    'compression': dataset.profile.get('compress', 'none'),
                    'issues': []
                }
                
                # Check for common issues
                if dataset.width > 20000 or dataset.height > 20000:
                    validation['issues'].append('Very large image dimensions may cause memory issues')
                
                if dataset.count > 10:
                    validation['issues'].append('High number of bands may slow processing')
                
                if not dataset.crs:
                    validation['issues'].append('No coordinate reference system (CRS) found')
                
                if validation['file_size_mb'] > 500:
                    validation['issues'].append('Large file size may require extended processing time')
                
                # Try to read a small sample
                try:
                    sample = dataset.read(1, window=((0, min(100, dataset.height)), (0, min(100, dataset.width))))
                    if np.all(np.isnan(sample)) or np.all(sample == 0):
                        validation['issues'].append('Sample data appears to be empty or invalid')
                except Exception as e:
                    validation['issues'].append(f'Unable to read sample data: {str(e)}')
                
                return validation
                
        except Exception as e:
            return {
                'valid': False,
                'error': str(e),
                'issues': [f'Cannot open file as GeoTIFF: {str(e)}']
            }
    
    def generate_statistics(self, file_path: str) -> Dict[str, Any]:
        """
        إنشاء إحصائيات مفصلة للملف الجغرافي
        """
        try:
            with rasterio.open(file_path) as dataset:
                stats = {
                    'general': {
                        'file_size_bytes': os.path.getsize(file_path),
                        'creation_time': datetime.fromtimestamp(os.path.getctime(file_path)).isoformat(),
                        'modification_time': datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                    },
                    'spatial': {
                        'width': dataset.width,
                        'height': dataset.height,
                        'pixel_count': dataset.width * dataset.height,
                        'bands': dataset.count,
                        'data_type': str(dataset.dtypes[0]),
                        'coordinate_system': str(dataset.crs) if dataset.crs else None,
                        'bounds': {
                            'left': float(dataset.bounds.left),
                            'bottom': float(dataset.bounds.bottom),
                            'right': float(dataset.bounds.right),
                            'top': float(dataset.bounds.top)
                        } if dataset.bounds else None,
                        'bounds_wgs84': self._transform_bounds_to_wgs84(dataset) if dataset.bounds and dataset.crs else None,
                        'pixel_size': {
                            'x': abs(dataset.transform.a) if dataset.transform else None,
                            'y': abs(dataset.transform.e) if dataset.transform else None
                        } if dataset.transform else None
                    },
                    'data_analysis': {}
                }
                
                # Analyze first band data
                try:
                    # Read data in chunks to avoid memory issues
                    sample_size = min(1000, dataset.width, dataset.height)
                    sample_data = dataset.read(1, window=((0, sample_size), (0, sample_size)))
                    
                    # Remove no-data values
                    valid_data = sample_data[~np.isnan(sample_data)]
                    if dataset.nodata is not None:
                        valid_data = valid_data[valid_data != dataset.nodata]
                    
                    if len(valid_data) > 0:
                        stats['data_analysis'] = {
                            'min_value': float(np.min(valid_data)),
                            'max_value': float(np.max(valid_data)),
                            'mean_value': float(np.mean(valid_data)),
                            'std_value': float(np.std(valid_data)),
                            'unique_values': int(len(np.unique(valid_data))),
                            'no_data_percentage': float((len(sample_data.flatten()) - len(valid_data)) / len(sample_data.flatten()) * 100),
                            'sample_size': len(sample_data.flatten())
                        }
                    else:
                        stats['data_analysis'] = {
                            'error': 'No valid data found in sample'
                        }
                        
                except Exception as e:
                    stats['data_analysis'] = {
                        'error': f'Data analysis failed: {str(e)}'
                    }
                
                return stats
                
        except Exception as e:
            return {
                'error': f'Statistics generation failed: {str(e)}'
            }
    
    def create_thumbnail(self, geotiff_path: str, output_path: str) -> bool:
        """
        إنشاء thumbnail من ملف GeoTIFF
        """
        try:
            with rasterio.open(geotiff_path) as dataset:
                # Calculate thumbnail dimensions
                width, height = dataset.width, dataset.height
                aspect_ratio = width / height
                
                if aspect_ratio > 1:
                    thumb_width = self.thumbnail_size
                    thumb_height = int(self.thumbnail_size / aspect_ratio)
                else:
                    thumb_height = self.thumbnail_size
                    thumb_width = int(self.thumbnail_size * aspect_ratio)
                
                # Read and resample data
                data = dataset.read(1, out_shape=(thumb_height, thumb_width), resampling=rasterio.enums.Resampling.average)
                
                # Convert to image
                if np.issubdtype(data.dtype, np.floating):
                    data = np.nan_to_num(data, nan=0.0)
                
                if data.max() > 0:
                    data = (data - data.min()) / (data.max() - data.min()) * 255
                data = data.astype(np.uint8)
                
                # Create and save image
                image = Image.fromarray(data)
                image.save(output_path, 'PNG', optimize=True)
                
                logger.info(f"Thumbnail created: {output_path} ({thumb_width}x{thumb_height})")
                return True
                
        except Exception as e:
            logger.error(f"Thumbnail creation failed: {e}")
            return False
    
    def process_geotiff_advanced(self, input_path: str, output_dir: str, job_config: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        معالجة متقدمة لملف GeoTIFF مع جميع الخيارات
        """
        job_config = job_config or {}
        
        # Validate input file
        validation = self.validate_geotiff_file(input_path)
        if not validation['valid']:
            raise Exception(f"Invalid GeoTIFF file: {validation.get('error', 'Unknown validation error')}")
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        file_name = Path(input_path).stem
        
        # Initialize result
        result = {
            'input_file': os.path.basename(input_path),
            'validation': validation,
            'output_files': {},
            'processing_time': {},
            'errors': []
        }
        
        start_time = datetime.now()
        
        try:
            # 1. Extract metadata
            logger.info("Extracting metadata...")
            metadata_start = datetime.now()
            metadata = extract_metadata(input_path)
            
            # Add advanced statistics if requested
            if self.include_statistics:
                metadata['statistics'] = self.generate_statistics(input_path)
            
            metadata_path = os.path.join(output_dir, f"{file_name}_metadata.json")
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)
            
            result['output_files']['metadata'] = metadata_path
            result['processing_time']['metadata'] = (datetime.now() - metadata_start).total_seconds()
            
        except Exception as e:
            error_msg = f"Metadata extraction failed: {str(e)}"
            logger.error(error_msg)
            result['errors'].append(error_msg)
        
        try:
            # 2. Convert to PNG
            logger.info("Converting to PNG...")
            png_start = datetime.now()
            
            # Use custom max size if provided
            max_size = job_config.get('maxSize') or self.max_image_size
            
            png_path = os.path.join(output_dir, f"{file_name}.png")
            convert_to_png(input_path, png_path, max_size)
            
            result['output_files']['png'] = png_path
            result['processing_time']['png'] = (datetime.now() - png_start).total_seconds()
            
        except Exception as e:
            error_msg = f"PNG conversion failed: {str(e)}"
            logger.error(error_msg)
            result['errors'].append(error_msg)
        
        try:
            # 3. Create World File
            logger.info("Creating World File...")
            world_start = datetime.now()
            
            world_file_path = os.path.join(output_dir, f"{file_name}.pgw")
            create_world_file(input_path, world_file_path)
            
            result['output_files']['world_file'] = world_file_path
            result['processing_time']['world_file'] = (datetime.now() - world_start).total_seconds()
            
        except Exception as e:
            error_msg = f"World file creation failed: {str(e)}"
            logger.error(error_msg)
            result['errors'].append(error_msg)
        
        try:
            # 4. Create thumbnail if requested
            if self.generate_thumbnails:
                logger.info("Creating thumbnail...")
                thumb_start = datetime.now()
                
                thumbnail_path = os.path.join(output_dir, f"{file_name}_thumbnail.png")
                if self.create_thumbnail(input_path, thumbnail_path):
                    result['output_files']['thumbnail'] = thumbnail_path
                    result['processing_time']['thumbnail'] = (datetime.now() - thumb_start).total_seconds()
                
        except Exception as e:
            error_msg = f"Thumbnail creation failed: {str(e)}"
            logger.error(error_msg)
            result['errors'].append(error_msg)
        
        # Calculate total processing time
        total_time = (datetime.now() - start_time).total_seconds()
        result['processing_time']['total'] = total_time
        
        # Summary
        result['summary'] = {
            'total_output_files': len(result['output_files']),
            'has_errors': len(result['errors']) > 0,
            'processing_time_seconds': total_time,
            'successful_operations': len([k for k in result['output_files'].keys()]),
            'failed_operations': len(result['errors'])
        }
        
        logger.info(f"Processing completed in {total_time:.2f}s with {len(result['errors'])} errors")
        
        return result
    
    def batch_process_files(self, input_files: List[str], output_base_dir: str, job_config: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        معالجة متعددة الملفات
        """
        batch_start = datetime.now()
        batch_result = {
            'files': {},
            'summary': {
                'total_files': len(input_files),
                'successful': 0,
                'failed': 0,
                'total_output_files': 0
            },
            'errors': []
        }
        
        for i, input_file in enumerate(input_files):
            try:
                logger.info(f"Processing file {i+1}/{len(input_files)}: {os.path.basename(input_file)}")
                
                # Create individual output directory
                file_output_dir = os.path.join(output_base_dir, f"file_{i+1}_{Path(input_file).stem}")
                
                # Process the file
                file_result = self.process_geotiff_advanced(input_file, file_output_dir, job_config)
                
                batch_result['files'][os.path.basename(input_file)] = file_result
                
                if file_result['summary']['has_errors']:
                    batch_result['summary']['failed'] += 1
                else:
                    batch_result['summary']['successful'] += 1
                
                batch_result['summary']['total_output_files'] += file_result['summary']['total_output_files']
                
            except Exception as e:
                error_msg = f"Failed to process {os.path.basename(input_file)}: {str(e)}"
                logger.error(error_msg)
                batch_result['errors'].append(error_msg)
                batch_result['summary']['failed'] += 1
                
                batch_result['files'][os.path.basename(input_file)] = {
                    'error': error_msg,
                    'traceback': traceback.format_exc()
                }
        
        # Calculate total batch time
        batch_time = (datetime.now() - batch_start).total_seconds()
        batch_result['summary']['total_processing_time'] = batch_time
        batch_result['summary']['average_time_per_file'] = batch_time / len(input_files) if input_files else 0
        
        logger.info(f"Batch processing completed: {batch_result['summary']['successful']}/{batch_result['summary']['total_files']} successful")
        
        return batch_result


def create_processor(config: Dict[str, Any] = None) -> GeoprocessingProcessor:
    """
    Factory function لإنشاء processor instance
    """
    return GeoprocessingProcessor(config)


# Example usage and testing
if __name__ == '__main__':
    import tempfile
    
    # Test processor
    config = {
        'max_image_size': 2048,
        'generate_thumbnails': True,
        'thumbnail_size': 256,
        'include_statistics': True
    }
    
    processor = create_processor(config)
    print("Processor created successfully")
    print(f"Configuration: {processor.config}")
    
    # This would be used in real scenarios:
    # result = processor.process_geotiff_advanced('input.tif', 'output_dir/', {'maxSize': 1024})
    # print(json.dumps(result, indent=2, default=str))