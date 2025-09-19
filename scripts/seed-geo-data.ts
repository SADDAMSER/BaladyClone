#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { 
  governorates, 
  districts, 
  subDistricts, 
  neighborhoods,
  sectors, 
  neighborhoodUnits, 
  blocks 
} from '../shared/schema';

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = postgres(connectionString);
const db = drizzle(sql);

// Types for GeoJSON features
interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: any;
  };
}

interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

// Helper function to read GeoJSON files
function readGeoJSONFile(filename: string): GeoJSONCollection {
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const filePath = path.join(scriptDir, 'data', filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

// Helper function to find existing record by external code
async function findByExternalCode(table: any, codeField: string, code: string) {
  const result = await db
    .select()
    .from(table)
    .where(eq(table[codeField], code))
    .limit(1);
  
  return result[0] || null;
}

// Function to seed sectors (القطاعات) from sctorfinal.geojson
async function seedSectors() {
  console.log('🌱 Seeding sectors...');
  
  const sectorsData = readGeoJSONFile('sctorfinal_1758314630360.geojson');
  let insertedCount = 0;
  let skippedCount = 0;

  for (const feature of sectorsData.features) {
    const props = feature.properties;
    
    // Use Zone_ as the sector code
    const sectorCode = props.Zone_;
    const admin1Pcod = props.admin1pcod;
    const admin2Name = props.admin2name || props.admin2na_1;
    
    if (!sectorCode || !admin1Pcod) {
      console.log(`⚠️  Skipping sector - missing required data:`, { sectorCode, admin1Pcod });
      skippedCount++;
      continue;
    }

    // Check if sector already exists
    const existing = await findByExternalCode(sectors, 'code', sectorCode);
    if (existing) {
      console.log(`⏭️  Sector ${sectorCode} already exists, skipping...`);
      skippedCount++;
      continue;
    }

    // Find the governorate by admin1Pcod
    const governorate = await findByExternalCode(governorates, 'code', admin1Pcod);
    if (!governorate) {
      console.log(`⚠️  Governorate not found for code: ${admin1Pcod}, skipping sector ${sectorCode}`);
      skippedCount++;
      continue;
    }

    try {
      await db.insert(sectors).values({
        code: sectorCode,
        nameAr: admin2Name || `قطاع ${sectorCode}`,
        nameEn: props.admin2name || `Sector ${sectorCode}`,
        governorateId: governorate.id,
        sectorType: 'planning',
        geometry: feature.geometry,
        properties: props,
        isActive: true
      });
      
      console.log(`✅ Inserted sector: ${sectorCode} (${admin2Name})`);
      insertedCount++;
    } catch (error) {
      console.error(`❌ Error inserting sector ${sectorCode}:`, error);
      skippedCount++;
    }
  }

  console.log(`🎯 Sectors summary: ${insertedCount} inserted, ${skippedCount} skipped`);
}

// Function to seed neighborhood units (وحدات الجوار) from unitsfinal.geojson
async function seedNeighborhoodUnits() {
  console.log('🌱 Seeding neighborhood units...');
  
  const unitsData = readGeoJSONFile('unitsfinal_1758314630359.geojson');
  let insertedCount = 0;
  let skippedCount = 0;

  for (const feature of unitsData.features) {
    const props = feature.properties;
    
    const uniqueUnitId = props.unique_unit_id;
    const citycode = props.citycode;
    const admin1Pcod = props.admin1Pcod;
    const admin2Pcod = props.admin2Pcod;
    const admin3Name = props.admin3Name;
    const unitNumber = props['ÑÞã_æÍÏÉ_Ç'] || props.unique_unit_id;
    const unitNameAr = props['ÇáãØÇÈÞÉ'] || `وحدة جوار ${uniqueUnitId}`;
    
    if (!uniqueUnitId) {
      console.log(`⚠️  Skipping unit - missing unique_unit_id`);
      skippedCount++;
      continue;
    }

    // Check if unit already exists by unique_unit_id
    const existing = await findByExternalCode(neighborhoodUnits, 'code', uniqueUnitId.toString());
    if (existing) {
      console.log(`⏭️  Neighborhood unit ${uniqueUnitId} already exists, skipping...`);
      skippedCount++;
      continue;
    }

    // Find related sector by citycode or admin codes
    let sectorId = null;
    if (citycode) {
      const sector = await findByExternalCode(sectors, 'code', citycode.toString());
      if (sector) {
        sectorId = sector.id;
      }
    }

    try {
      await db.insert(neighborhoodUnits).values({
        code: uniqueUnitId.toString(),
        nameAr: unitNameAr,
        nameEn: `Neighborhood Unit ${uniqueUnitId}`,
        sectorId: sectorId,
        neighborhoodId: null, // Will be linked later when neighborhoods are populated
        geometry: feature.geometry,
        properties: props,
        isActive: true
      });
      
      console.log(`✅ Inserted neighborhood unit: ${uniqueUnitId} (${unitNameAr})`);
      insertedCount++;
    } catch (error) {
      console.error(`❌ Error inserting neighborhood unit ${uniqueUnitId}:`, error);
      skippedCount++;
    }
  }

  console.log(`🎯 Neighborhood units summary: ${insertedCount} inserted, ${skippedCount} skipped`);
}

// Function to seed blocks (البلوكات) from blocksfinal.geojson
async function seedBlocks() {
  console.log('🌱 Seeding blocks...');
  
  const blocksData = readGeoJSONFile('blocksfinal_1758314630359.geojson');
  let insertedCount = 0;
  let skippedCount = 0;

  for (const feature of blocksData.features) {
    const props = feature.properties;
    
    const blockId = props.Id;
    const uniqueUnitId = props.unique_unit_id;
    const citycode = props.citycode;
    const admin1Pcod = props.admin1Pcod;
    const admin2Pcod = props.admin2Pcod;
    const admin3Name = props.admin3Name;
    const shapeArea = props.Shape_Area;
    
    if (!blockId || !uniqueUnitId) {
      console.log(`⚠️  Skipping block - missing required data:`, { blockId, uniqueUnitId });
      skippedCount++;
      continue;
    }

    // Check if block already exists
    const blockCode = `${uniqueUnitId}-${blockId}`;
    const existing = await findByExternalCode(blocks, 'code', blockCode);
    if (existing) {
      console.log(`⏭️  Block ${blockCode} already exists, skipping...`);
      skippedCount++;
      continue;
    }

    // Find related neighborhood unit
    const neighborhoodUnit = await findByExternalCode(neighborhoodUnits, 'code', uniqueUnitId.toString());
    if (!neighborhoodUnit) {
      console.log(`⚠️  Neighborhood unit not found for code: ${uniqueUnitId}, skipping block ${blockId}`);
      skippedCount++;
      continue;
    }

    try {
      await db.insert(blocks).values({
        code: blockCode,
        nameAr: `بلوك ${blockId}`,
        nameEn: `Block ${blockId}`,
        neighborhoodUnitId: neighborhoodUnit.id,
        blockType: 'residential', // Default type, can be updated later
        geometry: feature.geometry,
        properties: props,
        isActive: true
      });
      
      console.log(`✅ Inserted block: ${blockCode} (area: ${shapeArea})`);
      insertedCount++;
    } catch (error) {
      console.error(`❌ Error inserting block ${blockCode}:`, error);
      skippedCount++;
    }
  }

  console.log(`🎯 Blocks summary: ${insertedCount} inserted, ${skippedCount} skipped`);
}

// Function to seed sub-districts (العزل) from azafinall.geojson
async function seedSubDistricts() {
  console.log('🌱 Seeding sub-districts (عزل)...');
  
  const azalData = readGeoJSONFile('azafinall_1758314630360.geojson');
  let insertedCount = 0;
  let skippedCount = 0;

  for (const feature of azalData.features) {
    const props = feature.properties;
    
    const azalcode = props.azalcode;
    const admin1Pcod = props.admin1Pcod;
    const admin2Pcod = props.admin2Pcod;
    const admin3Name = props.admin3Name;
    const admin3NameAr = props.admin3Na_1;
    
    if (!azalcode || !admin1Pcod || !admin2Pcod) {
      console.log(`⚠️  Skipping عزلة - missing required data:`, { azalcode, admin1Pcod, admin2Pcod });
      skippedCount++;
      continue;
    }

    // Check if sub-district already exists
    const existing = await findByExternalCode(subDistricts, 'code', azalcode.toString());
    if (existing) {
      console.log(`⏭️  Sub-district ${azalcode} already exists, skipping...`);
      skippedCount++;
      continue;
    }

    // Find the district by admin2Pcod
    const district = await findByExternalCode(districts, 'code', admin2Pcod);
    if (!district) {
      console.log(`⚠️  District not found for code: ${admin2Pcod}, skipping عزلة ${azalcode}`);
      skippedCount++;
      continue;
    }

    try {
      await db.insert(subDistricts).values({
        code: azalcode.toString(),
        nameAr: admin3NameAr || admin3Name || `عزلة ${azalcode}`,
        nameEn: admin3Name || `Sub-district ${azalcode}`,
        districtId: district.id,
        geometry: feature.geometry,
        properties: props,
        isActive: true
      });
      
      console.log(`✅ Inserted sub-district: ${azalcode} (${admin3NameAr || admin3Name})`);
      insertedCount++;
    } catch (error) {
      console.error(`❌ Error inserting sub-district ${azalcode}:`, error);
      skippedCount++;
    }
  }

  console.log(`🎯 Sub-districts summary: ${insertedCount} inserted, ${skippedCount} skipped`);
}

// Main seeding function
async function main() {
  console.log('🚀 Starting geographic data seeding...');
  console.log('📂 Loading GeoJSON files from scripts/data/');
  
  try {
    // Seed in order of dependencies
    await seedSubDistricts(); // First: عزل (sub-districts)
    await seedSectors();       // Second: قطاعات (sectors)  
    await seedNeighborhoodUnits(); // Third: وحدات الجوار (neighborhood units)
    await seedBlocks();           // Fourth: بلوكات (blocks)
    
    console.log('🎉 Geographic data seeding completed successfully!');
  } catch (error) {
    console.error('💥 Error during seeding:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the script
main();