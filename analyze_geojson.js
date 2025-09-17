#!/usr/bin/env node

import fs from 'fs';

// تحليل ملف المحافظات
console.log('🔍 تحليل ملف المحافظات...');
const govData = JSON.parse(fs.readFileSync('attached_assets/gov_1757712010855.geojson', 'utf8'));

console.log('📊 إحصائيات المحافظات:');
console.log(`- عدد المحافظات: ${govData.features.length}`);
console.log(`- أول محافظة: ${JSON.stringify(govData.features[0].properties, null, 2)}`);

// تحليل ملف المديريات (قراءة عينة صغيرة)
console.log('\n🔍 تحليل ملف المديريات...');
try {
  const districtFileContent = fs.readFileSync('attached_assets/dis_1757712010854.geojson', 'utf8');
  
  // استخراج أول feature لفهم البنية
  const firstFeatureMatch = districtFileContent.match(/"type":\s*"Feature"[^}]+?"properties":\s*\{[^}]+?\}/);
  
  if (firstFeatureMatch) {
    console.log('📊 بنية المديرية الأولى:');
    console.log(firstFeatureMatch[0]);
  }
  
  // البحث عن admin1Pcod
  const admin1Matches = districtFileContent.match(/"admin1Pcod":\s*"[^"]+"/g);
  if (admin1Matches) {
    console.log('\n🔗 أمثلة على admin1Pcod:');
    admin1Matches.slice(0, 5).forEach(match => console.log(match));
  }
  
  // عد المديريات التقريبي
  const featureCount = (districtFileContent.match(/"type":\s*"Feature"/g) || []).length;
  console.log(`\n📊 عدد المديريات التقريبي: ${featureCount}`);
  
} catch (error) {
  console.error('❌ خطأ في قراءة ملف المديريات:', error.message);
}

// طباعة رموز المحافظات لفهم التسمية
console.log('\n📋 قائمة المحافظات مع رموزها:');
govData.features.forEach(feature => {
  const props = feature.properties;
  console.log(`${props.code}: ${props.name_en} (${props.name_ar})`);
});