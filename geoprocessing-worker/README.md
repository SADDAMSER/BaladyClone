# منصة بناء اليمن - Geoprocessing Worker

## نظرة عامة

Worker مختص بمعالجة ملفات GeoTIFF باستخدام database polling pattern مع دعم SKIP LOCKED وheartbeat mechanism للمراقبة والأمان.

## الميزات الرئيسية

### 🔄 **Queue Processing**
- Database polling مع SKIP LOCKED لتجنب تضارب المعالجة
- Heartbeat mechanism للمراقبة المستمرة
- Auto-retry عند الفشل مع backoff strategy
- Progress tracking في الوقت الفعلي

### 🗺️ **GeoTIFF Processing**
- تحويل GeoTIFF إلى PNG مع تحسين الجودة
- استخراج البيانات الوصفية الجغرافية
- إنشاء World Files للإسناد الجغرافي
- دعم الملفات الكبيرة (حتى 100MB)

### 🔒 **Security & Reliability**
- File validation و type checking
- Secure file download/upload مع signed URLs
- Error handling شامل مع logging تفصيلي
- Cleanup تلقائي للملفات المؤقتة

### 📊 **Monitoring & Health**
- Health checks شامل للنظام
- Performance metrics و statistics
- Structured logging مع rotation
- Database connection monitoring

## التثبيت والإعداد

### 1. المتطلبات الأساسية

```bash
# Python 3.8+ مطلوب
python3 --version

# PostgreSQL database متاح
psql --version

# متغيرات البيئة مطلوبة
export PGHOST="your-db-host"
export PGDATABASE="your-db-name"
export PGUSER="your-db-user"
export PGPASSWORD="your-db-password"
export API_BASE_URL="http://localhost:5000"
export WORKER_AUTH_TOKEN="your-worker-token"
```

### 2. تثبيت Dependencies

```bash
cd geoprocessing-worker

# إنشاء virtual environment
python3 -m venv venv
source venv/bin/activate

# تثبيت المكتبات
pip install -r requirements.txt
```

### 3. التحقق من الإعدادات

```bash
# فحص الإعدادات
python3 config.py

# فحص الاتصالات
python3 health_check.py
```

### 4. تشغيل Worker

```bash
# تشغيل تلقائي مع جميع الفحوصات
./start_worker.sh

# أو تشغيل مباشر
python3 worker.py
```

## الإعدادات المتقدمة

### متغيرات البيئة

| المتغير | الوصف | القيمة الافتراضية |
|---------|--------|-------------------|
| `WORKER_NAME` | اسم Worker | `geoprocessing-worker` |
| `POLL_INTERVAL` | فترة الاستعلام (ثانية) | `5` |
| `HEARTBEAT_INTERVAL` | فترة Heartbeat (ثانية) | `30` |
| `MAX_PROCESSING_TIME` | أقصى وقت معالجة (ثانية) | `3600` |
| `MAX_FILE_SIZE` | أقصى حجم ملف (بايت) | `104857600` (100MB) |
| `CONCURRENT_JOBS` | عدد Jobs المتزامنة | `1` |
| `LOG_LEVEL` | مستوى التسجيل | `INFO` |

### إعدادات المعالجة

```python
# في config.py
PROCESSING_CONFIG = {
    'max_image_size': 4096,     # أقصى أبعاد PNG
    'compression_quality': 85,  # جودة الضغط
    'generate_thumbnails': True, # إنشاء thumbnails
    'thumbnail_size': 256,      # حجم thumbnail
    'coordinate_system': 'EPSG:4326'  # نظام الإحداثيات
}
```

## استخدام Worker

### 1. إنشاء Geo Job

```bash
# عبر API
curl -X POST http://localhost:5000/api/geo-jobs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskType": "geotiff_to_png",
    "priority": 1,
    "inputPayload": {
      "maxSize": 2048,
      "outputFormat": "png"
    }
  }'
```

### 2. رفع Input Files

```bash
# الحصول على upload URL
curl -X POST http://localhost:5000/api/geo-jobs/{job-id}/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "fileName": "map.tif",
    "fileSize": 1024000,
    "fileType": "image/tiff"
  }'

# رفع الملف باستخدام signed URL
curl -X PUT "SIGNED_UPLOAD_URL" \
  --data-binary @map.tif
```

### 3. مراقبة التقدم

```bash
# فحص حالة Job
curl http://localhost:5000/api/geo-jobs/{job-id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# فحص الأحداث
curl http://localhost:5000/api/geo-jobs/{job-id}/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. تحميل النتائج

```bash
# الحصول على download URLs
curl http://localhost:5000/api/geo-jobs/{job-id}/download/output \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## مراقبة Worker

### Health Check

```bash
# فحص صحة شامل
python3 health_check.py

# النتيجة المتوقعة
✅ Database: Database connection successful
✅ Api: API connection successful  
✅ File_System: File system accessible
✅ Dependencies: All dependencies available

🎉 Overall Status: HEALTHY - Worker is ready to process jobs
```

### Logs مفيدة

```bash
# مراقبة logs في الوقت الفعلي
tail -f worker.log

# البحث عن أخطاء
grep ERROR worker.log

# إحصائيات معالجة
grep "Job.*completed" worker.log | wc -l
```

### Performance Monitoring

```bash
# فحص استخدام الذاكرة
ps aux | grep worker.py

# فحص ملفات مؤقتة
ls -la /tmp/geojob_*

# فحص اتصالات قاعدة البيانات
netstat -an | grep 5432
```

## استكشاف الأخطاء

### مشاكل شائعة

#### 1. فشل اتصال قاعدة البيانات
```bash
# فحص المتغيرات
echo $PGHOST $PGDATABASE $PGUSER

# اختبار الاتصال
psql -h $PGHOST -d $PGDATABASE -U $PGUSER -c "SELECT 1;"
```

#### 2. فشل اتصال API
```bash
# فحص API
curl http://localhost:5000/health

# فحص Worker authentication
curl -H "Authorization: Worker your-token" \
     http://localhost:5000/api/internal/geo-jobs/claim
```

#### 3. مشاكل معالجة الملفات
```bash
# فحص مساحة القرص
df -h /tmp

# فحص صلاحيات الملفات
ls -la /tmp/geojob_*

# اختبار معالجة مباشرة
cd ../geotiff-processor-poc
python3 main.py your-test-file.tif
```

#### 4. مشاكل الذاكرة
```bash
# فحص استخدام الذاكرة
free -m

# تقليل الملفات المتزامنة
export CONCURRENT_JOBS=1
export MAX_FILE_SIZE=50000000  # 50MB
```

## API Integration

Worker يستخدم endpoints التالية:

- `POST /api/internal/geo-jobs/claim` - طلب job جديد
- `PATCH /api/internal/geo-jobs/{id}/progress` - تحديث التقدم
- `PATCH /api/internal/geo-jobs/{id}/heartbeat` - إرسال heartbeat
- `PATCH /api/internal/geo-jobs/{id}/complete` - إكمال job
- `PATCH /api/internal/geo-jobs/{id}/fail` - فشل job

## Docker Deployment (اختياري)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN chmod +x start_worker.sh

CMD ["./start_worker.sh"]
```

```bash
# بناء Image
docker build -t yemen-geoprocessing-worker .

# تشغيل Container
docker run -d \
  -e PGHOST=your-db-host \
  -e PGDATABASE=your-db \
  -e PGUSER=your-user \
  -e PGPASSWORD=your-password \
  -e API_BASE_URL=http://your-api:5000 \
  yemen-geoprocessing-worker
```

## الأمان

### Best Practices

1. **حماية متغيرات البيئة**
   ```bash
   # استخدم .env file
   cp .env.example .env
   chmod 600 .env
   ```

2. **تشفير الاتصالات**
   ```bash
   export PGSSL=require
   export API_BASE_URL=https://your-secure-api
   ```

3. **حماية الملفات**
   ```bash
   # صلاحيات آمنة للملفات المؤقتة
   umask 077
   export TEMP_DIR=/secure/temp/path
   ```

4. **مراقبة الأمان**
   ```bash
   # تفعيل security scanning
   export VALIDATE_FILE_HEADERS=true
   export SCAN_FOR_MALWARE=true
   ```

## Support

للحصول على المساعدة:

1. فحص [Health Check](#health-check) أولاً
2. مراجعة [Logs](#logs-مفيدة) للأخطاء
3. التحقق من [مشاكل شائعة](#مشاكل-شائعة)
4. فحص إعدادات [متغيرات البيئة](#متغيرات-البيئة)

---

**منصة بناء اليمن الرقمية** - نحو مستقبل رقمي متقدم 🇾🇪