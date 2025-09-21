# معالج GeoTIFF - إثبات المفهوم (PoC)

هذا المشروع هو إثبات مفهوم لمعالج GeoTIFF، مصمم لتحويل ملفات GeoTIFF إلى صيغة PNG مع الحفاظ على المعلومات الجغرافية.

## المتطلبات

- Python 3.8+
- المكتبات المذكورة في ملف requirements.txt

## التثبيت

```bash
pip install -r requirements.txt
```

## الاستخدام

```bash
python main.py مسار/الملف.tif [OPTIONS]
```

## الخيارات

- `-o, --output-dir`: مجلد المخرجات (الافتراضي: ./output)
- `-m, --max-size`: الحد الأقصى لأبعاد الصورة بالبكسل

## مثال

```bash
python main.py data/sample.tif -o output -m 2048
```

## المخرجات

- **ملف PNG**: يحتوي على الصورة المحولة
- **ملف PGW**: يحتوي على معلومات الإسناد الجغرافي
- **ملف JSON**: يحتوي على البيانات الوصفية المستخرجة

## التحقق من الصحة

للتحقق من صحة المخرجات، يمكنك مقارنة البيانات الوصفية المستخرجة مع مخرجات أداة gdalinfo:

```bash
gdalinfo data/sample.tif
```

ثم مقارنة النتائج مع الملف:

```bash
cat output/sample_metadata.json
```

## الترخيص

MIT