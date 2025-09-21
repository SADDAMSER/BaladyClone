#!/usr/bin/env python3
"""
سكريبت إثبات المفهوم لمعالج GeoTIFF
"""

import os
import sys
import json
import rasterio
import numpy as np
from PIL import Image
from pathlib import Path
import click

def create_output_dir(output_dir):
    """إنشاء مجلد المخرجات إذا لم يكن موجودًا"""
    Path(output_dir).mkdir(parents=True, exist_ok=True)

def extract_metadata(geotiff_path):
    """استخراج البيانات الوصفية من ملف GeoTIFF"""
    with rasterio.open(geotiff_path) as dataset:
        metadata = {
            "driver": dataset.driver,
            "width": dataset.width,
            "height": dataset.height,
            "count": dataset.count,
            "dtype": str(dataset.dtypes[0]),
            "crs": str(dataset.crs) if dataset.crs else None,
            "transform": list(dataset.transform)[:6],
            "bounds": {
                "left": float(dataset.bounds.left),
                "bottom": float(dataset.bounds.bottom),
                "right": float(dataset.bounds.right),
                "top": float(dataset.bounds.top)
            }
        }
        return metadata

def convert_to_png(geotiff_path, output_path, max_size=None):
    """تحويل ملف GeoTIFF إلى صيغة PNG"""
    with rasterio.open(geotiff_path) as dataset:
        # قراءة البيانات
        data = dataset.read(1)
        
        # معالجة القيم غير الصالحة
        if np.issubdtype(data.dtype, np.floating):
            # استبدال القيم غير الصالحة (NaN) بـ 0
            data = np.nan_to_num(data, nan=0.0)
        
        # تطبيع القيم إلى النطاق 0-255
        if data.max() > 0:
            data = (data - data.min()) / (data.max() - data.min()) * 255
        data = data.astype(np.uint8)
        
        # إنشاء صورة PIL
        image = Image.fromarray(data)
        
        # تغيير الحجم إذا تم تحديد الحد الأقصى
        if max_size and max(image.size) > max_size:
            ratio = max_size / max(image.size)
            new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
            image = image.resize(new_size, Image.LANCZOS)
        
        # حفظ الصورة
        image.save(output_path)

def create_world_file(geotiff_path, output_path):
    """إنشاء ملف الإسناد الجغرافي (World File)"""
    with rasterio.open(geotiff_path) as dataset:
        # استخراج معاملات التحويل
        transform = dataset.transform
        
        # كتابة ملف World File
        with open(output_path, 'w') as f:
            f.write(f"{transform.a}\n")  # حجم البكسل في اتجاه X
            f.write(f"{transform.b}\n")  # معامل الدوران
            f.write(f"{transform.d}\n")  # معامل الدوران
            f.write(f"{transform.e}\n")  # حجم البكسل في اتجاه Y (عادة سالب)
            f.write(f"{transform.c}\n")  # إحداثي X للزاوية العلوية اليسرى
            f.write(f"{transform.f}\n")  # إحداثي Y للزاوية العلوية اليسرى

def process_geotiff(geotiff_path, output_dir, max_size=None):
    """معالجة ملف GeoTIFF"""
    # إنشاء مجلد المخرجات
    create_output_dir(output_dir)
    
    # استخراج اسم الملف الأساسي
    file_name = Path(geotiff_path).stem
    
    # استخراج البيانات الوصفية
    metadata = extract_metadata(geotiff_path)
    
    # تحويل إلى PNG
    png_path = os.path.join(output_dir, f"{file_name}.png")
    convert_to_png(geotiff_path, png_path, max_size)
    
    # إنشاء ملف World File
    world_file_path = os.path.join(output_dir, f"{file_name}.pgw")
    create_world_file(geotiff_path, world_file_path)
    
    # حفظ البيانات الوصفية
    metadata_path = os.path.join(output_dir, f"{file_name}_metadata.json")
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    return {
        "png_path": png_path,
        "world_file_path": world_file_path,
        "metadata_path": metadata_path,
        "metadata": metadata
    }

@click.command()
@click.argument('geotiff_path', type=click.Path(exists=True))
@click.option('--output-dir', '-o', default='./output', help='مجلد المخرجات')
@click.option('--max-size', '-m', type=int, help='الحد الأقصى لأبعاد الصورة')
def main(geotiff_path, output_dir, max_size):
    """
    معالجة ملف GeoTIFF وتحويله إلى PNG مع إنشاء ملف الإسناد الجغرافي
    
    GEOTIFF_PATH: مسار ملف GeoTIFF المراد معالجته
    """
    try:
        click.echo(f"جاري معالجة الملف: {geotiff_path}")
        result = process_geotiff(geotiff_path, output_dir, max_size)
        click.echo(f"تمت المعالجة بنجاح!")
        click.echo(f"ملف PNG: {result['png_path']}")
        click.echo(f"ملف الإسناد الجغرافي: {result['world_file_path']}")
        click.echo(f"ملف البيانات الوصفية: {result['metadata_path']}")
    except Exception as e:
        click.echo(f"حدث خطأ: {e}", err=True)
        sys.exit(1)

if __name__ == '__main__':
    main()