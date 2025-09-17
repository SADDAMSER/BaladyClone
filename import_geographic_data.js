#!/usr/bin/env node

import fs from 'fs';
import pkg from 'pg';

const { Pool } = pkg;

// إعداد اتصال قاعدة البيانات
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false // Replit development database
});

console.log('🚀 بدء استيراد البيانات الجغرافية لليمن...\n');

async function importGeographicData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // ===================================
    // مرحلة 1: تنظيف البيانات الموجودة
    // ===================================
    console.log('🧹 تنظيف البيانات الموجودة...');
    
    // حذف المديريات أولاً (بسبب foreign key)
    await client.query('DELETE FROM districts');
    console.log('  ✅ تم حذف جميع المديريات الموجودة');
    
    // حذف المحافظات
    await client.query('DELETE FROM governorates'); 
    console.log('  ✅ تم حذف جميع المحافظات الموجودة');
    
    // ===================================
    // مرحلة 2: استيراد المحافظات
    // ===================================
    console.log('\n📍 استيراد بيانات المحافظات...');
    
    const govData = JSON.parse(fs.readFileSync('attached_assets/gov_1757712010855.geojson', 'utf8'));
    
    for (const feature of govData.features) {
      const props = feature.properties;
      
      // تصحيح خطأ التسمية المخلوطة
      const nameAr = props.name_en; // العربي في حقل name_en
      const nameEn = props.name_ar; // الإنجليزي في حقل name_ar
      
      const result = await client.query(`
        INSERT INTO governorates (code, name_ar, name_en, geometry, properties, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, code, name_ar
      `, [
        props.code,           // مثل YE11
        nameAr,              // الاسم العربي المصحح
        nameEn,              // الاسم الإنجليزي المصحح
        JSON.stringify(feature.geometry), // PostGIS geometry
        JSON.stringify(props) // خصائص إضافية
      ]);
      
      console.log(`  ✅ ${result.rows[0].code}: ${result.rows[0].name_ar}`);
    }
    
    console.log(`\n📊 تم استيراد ${govData.features.length} محافظة بنجاح!`);
    
    // ===================================
    // مرحلة 3: إنشاء خريطة للمحافظات
    // ===================================
    console.log('\n🗺️  إنشاء خريطة المحافظات للربط...');
    
    const governoratesMap = new Map();
    const govResult = await client.query('SELECT id, code FROM governorates');
    
    for (const gov of govResult.rows) {
      governoratesMap.set(gov.code, gov.id);
    }
    
    console.log(`  ✅ تم إنشاء خريطة ${governoratesMap.size} محافظة`);
    
    // ===================================
    // مرحلة 4: استيراد المديريات
    // ===================================
    console.log('\n🏘️  استيراد بيانات المديريات...');
    
    const districtFileContent = fs.readFileSync('attached_assets/dis_1757712010854.geojson', 'utf8');
    const districtData = JSON.parse(districtFileContent);
    
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const feature of districtData.features) {
      const props = feature.properties;
      
      // البحث عن المحافظة المقترنة
      const governorateId = governoratesMap.get(props.admin1Pcod);
      
      if (!governorateId) {
        console.log(`  ⚠️  تم تخطي المديرية ${props.admin2Na_1} - لم يتم العثور على المحافظة ${props.admin1Pcod}`);
        skippedCount++;
        continue;
      }
      
      // الحصول على الأسماء الصحيحة
      const nameAr = props.admin2Na_1 || props.admin2Name || 'غير محدد';
      const nameEn = props.admin2Name || props.admin2Na_1 || 'Unknown';
      
      await client.query(`
        INSERT INTO districts (code, name_ar, name_en, governorate_id, geometry, properties, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        props.admin2Pcod,     // رمز المديرية مثل YE1101
        nameAr,               // الاسم العربي
        nameEn,               // الاسم الإنجليزي
        governorateId,        // معرف المحافظة
        JSON.stringify(feature.geometry), // البيانات الجغرافية
        JSON.stringify(props) // الخصائص الإضافية
      ]);
      
      importedCount++;
      
      // طباعة تقدم كل 50 مديرية
      if (importedCount % 50 === 0) {
        console.log(`  📈 تم استيراد ${importedCount} مديرية...`);
      }
    }
    
    console.log(`\n📊 إحصائيات استيراد المديريات:`);
    console.log(`  ✅ تم استيراد: ${importedCount} مديرية`);
    console.log(`  ⚠️  تم تخطي: ${skippedCount} مديرية`);
    
    // ===================================
    // مرحلة 5: التحقق من البيانات
    // ===================================
    console.log('\n🔍 التحقق من سلامة البيانات...');
    
    // إحصائيات المحافظات
    const govCount = await client.query('SELECT COUNT(*) as count FROM governorates');
    console.log(`  📍 إجمالي المحافظات: ${govCount.rows[0].count}`);
    
    // إحصائيات المديريات
    const distCount = await client.query('SELECT COUNT(*) as count FROM districts');
    console.log(`  🏘️  إجمالي المديريات: ${distCount.rows[0].count}`);
    
    // إحصائيات المديريات لكل محافظة
    const govDistCount = await client.query(`
      SELECT g.name_ar, g.code, COUNT(d.id) as district_count
      FROM governorates g
      LEFT JOIN districts d ON g.id = d.governorate_id
      GROUP BY g.id, g.name_ar, g.code
      ORDER BY g.code
    `);
    
    console.log('\n📋 توزيع المديريات على المحافظات:');
    for (const row of govDistCount.rows) {
      console.log(`  ${row.code}: ${row.name_ar} (${row.district_count} مديرية)`);
    }
    
    // التحقق من المديريات غير المربوطة
    const orphanDistricts = await client.query(`
      SELECT COUNT(*) as count FROM districts WHERE governorate_id IS NULL
    `);
    
    if (orphanDistricts.rows[0].count > 0) {
      console.log(`  ⚠️  توجد ${orphanDistricts.rows[0].count} مديرية غير مربوطة بمحافظة!`);
    } else {
      console.log('  ✅ جميع المديريات مربوطة بمحافظاتها بشكل صحيح');
    }
    
    await client.query('COMMIT');
    console.log('\n🎉 تم إنجاز استيراد البيانات الجغرافية بنجاح!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ خطأ في استيراد البيانات:', error);
    throw error;
  } finally {
    client.release();
  }
}

// تشغيل عملية الاستيراد
importGeographicData()
  .then(() => {
    console.log('\n✨ اكتمل استيراد البيانات الجغرافية لليمن!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 فشل في استيراد البيانات:', error.message);
    process.exit(1);
  });