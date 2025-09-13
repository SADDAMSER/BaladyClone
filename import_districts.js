#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const sql = neon(process.env.DATABASE_URL);

async function importDistricts() {
  console.log('🚀 بدء استيراد بيانات المديريات...');
  
  try {
    // Read GeoJSON file
    const filePath = path.join(__dirname, 'attached_assets', 'dis_1757712010854.geojson');
    console.log('📁 قراءة الملف:', filePath);
    
    const rawData = fs.readFileSync(filePath, 'utf8');
    const geojson = JSON.parse(rawData);
    
    console.log(`📊 عدد المديريات في الملف: ${geojson.features.length}`);
    
    // Clear existing districts (optional - for clean import)
    console.log('🧹 حذف البيانات الموجودة...');
    await sql`DELETE FROM districts`;
    
    let imported = 0;
    let errors = 0;
    
    for (const feature of geojson.features) {
      try {
        const properties = feature.properties || {};
        
        // Extract names and codes from properties  
        const nameAr = properties.admin2Na_1 || properties.admin2Name || 'غير محدد';
        const nameEn = properties.admin2Name || properties.admin2RefN || null;
        const code = properties.admin2Pcod || null;
        
        // Find the governorate based on admin1Pcod
        const govCode = properties.admin1Pcod; // YE11, YE12, etc.
        
        let governorateId = null;
        if (govCode) {
          const [gov] = await sql`
            SELECT id FROM governorates 
            WHERE code = ${govCode}
            LIMIT 1
          `;
          if (gov) governorateId = gov.id;
        }
        
        if (!governorateId) {
          console.warn(`⚠️  لم يتم العثور على محافظة بكود ${govCode} للمديرية: ${nameAr}`);
          errors++;
          continue;
        }
        
        // Insert district
        await sql`
          INSERT INTO districts (
            code, 
            name_ar, 
            name_en, 
            governorate_id, 
            geometry, 
            properties
          ) VALUES (
            ${code},
            ${nameAr},
            ${nameEn},
            ${governorateId},
            ${JSON.stringify(feature.geometry)},
            ${JSON.stringify(properties)}
          )
        `;
        
        imported++;
        if (imported % 10 === 0) {
          console.log(`✅ تم استيراد ${imported} مديرية...`);
        }
        
      } catch (error) {
        console.error(`❌ خطأ في استيراد المديرية: ${feature.properties?.name_ar || 'غير معروف'}`, error.message);
        errors++;
      }
    }
    
    console.log(`🎉 تم الانتهاء من الاستيراد!`);
    console.log(`✅ تم استيراد: ${imported} مديرية`);
    console.log(`❌ أخطاء: ${errors}`);
    
    // Verify import
    const [result] = await sql`SELECT COUNT(*) as count FROM districts`;
    console.log(`📊 إجمالي المديريات في قاعدة البيانات: ${result.count}`);
    
  } catch (error) {
    console.error('💥 فشل في استيراد البيانات:', error);
    process.exit(1);
  }
}

// Run the import
importDistricts();