import fs from 'fs';

console.log('🔍 تحليل ملف تطبيق المساحين...\n');

try {
    const zipPath = './attached_assets/dreamflow_app_1758162565973.zip';
    
    // Check if file exists and get basic info
    const stats = fs.statSync(zipPath);
    console.log(`📦 حجم الملف: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📅 تاريخ التعديل: ${stats.mtime.toLocaleString()}\n`);
    
    // Read file header to identify content
    const buffer = fs.readFileSync(zipPath);
    const header = buffer.subarray(0, 100);
    
    console.log('📝 محتويات رأس الملف:');
    console.log(header.toString('hex', 0, 32));
    
    // Check for ZIP signature
    const zipSig = buffer.readUInt32LE(0);
    if (zipSig === 0x04034b50) {
        console.log('✅ ملف ZIP صالح\n');
        
        // Try to read central directory for file list
        console.log('🗂️ محاولة قراءة قائمة الملفات...');
        
        // Look for central directory end record
        let eocdOffset = -1;
        for (let i = buffer.length - 22; i >= 0; i--) {
            if (buffer.readUInt32LE(i) === 0x06054b50) {
                eocdOffset = i;
                break;
            }
        }
        
        if (eocdOffset >= 0) {
            const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
            const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
            
            console.log(`📊 عدد الملفات: ${totalEntries}`);
            console.log(`📍 موقع دليل الملفات: ${cdOffset}\n`);
            
            // Read some file entries
            let currentOffset = cdOffset;
            let fileCount = 0;
            
            console.log('📋 قائمة ببعض الملفات:');
            
            while (fileCount < Math.min(totalEntries, 10) && currentOffset < buffer.length - 46) {
                if (buffer.readUInt32LE(currentOffset) === 0x02014b50) {
                    const filenameLength = buffer.readUInt16LE(currentOffset + 28);
                    const extraLength = buffer.readUInt16LE(currentOffset + 30);
                    const commentLength = buffer.readUInt16LE(currentOffset + 32);
                    
                    if (currentOffset + 46 + filenameLength <= buffer.length) {
                        const filename = buffer.subarray(currentOffset + 46, currentOffset + 46 + filenameLength).toString('utf8');
                        console.log(`  📄 ${filename}`);
                        
                        currentOffset += 46 + filenameLength + extraLength + commentLength;
                        fileCount++;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
            
            if (fileCount < totalEntries) {
                console.log(`  ... و ${totalEntries - fileCount} ملف آخر`);
            }
        }
    } else {
        console.log('❌ ليس ملف ZIP صالح');
    }
    
} catch (error) {
    console.error('❌ خطأ في تحليل الملف:', error.message);
}