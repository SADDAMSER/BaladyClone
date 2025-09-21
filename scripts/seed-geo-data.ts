#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, inArray, sql as drizzleSql } from 'drizzle-orm';
import { 
  governorates, 
  districts, 
  subDistricts, 
  neighborhoods,
  sectors, 
  neighborhoodUnits, 
  blocks,
  insertGovernorateSchema,
  insertDistrictSchema,
  insertSubDistrictSchema,
  insertSectorSchema,
  insertNeighborhoodUnitSchema,
  insertBlockSchema,
  type InsertGovernorate,
  type InsertDistrict,
  type InsertSubDistrict,
  type InsertSector,
  type InsertNeighborhoodUnit,
  type InsertBlock
} from '../shared/schema';

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = postgres(connectionString);
const db = drizzle(sql);

// Configuration
const BATCH_SIZE = 500;
const PROGRESS_INTERVAL = 100;

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

// Helper function to read GeoJSON files with flexible naming
function readGeoJSONFile(pattern: string): GeoJSONCollection {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const dataDir = path.join(scriptDir, 'data');
  
  // Find files matching pattern
  const files = fs.readdirSync(dataDir).filter(f => f.includes(pattern) && f.endsWith('.geojson'));
  
  if (files.length === 0) {
    throw new Error(`No GeoJSON file found matching pattern: ${pattern}`);
  }
  
  const filePath = path.join(dataDir, files[0]);
  console.log(`📖 Reading: ${files[0]}`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

// Helper function to create lookup maps
function createLookupMap<T extends { id: string; code: string | null }>(items: T[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) {
    if (item.code) {
      map.set(item.code, item.id);
    }
  }
  return map;
}

// Helper function to resolve property keys with fallbacks
function getProp(properties: any, keys: string[]): string | null {
  for (const key of keys) {
    const value = properties[key];
    if (value !== undefined && value !== null && value !== '') {
      return value.toString();
    }
  }
  return null;
}

// Helper function to chunk array
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Function to seed governorates (المحافظات) from gov.geojson
async function seedGovernorates() {
  console.log('🌱 Seeding governorates (محافظات)...');
  
  // Preload existing data
  const existingGovernorates = await db.select({ id: governorates.id, code: governorates.code }).from(governorates);
  const existingCodes = new Set(existingGovernorates.map(g => g.code).filter(Boolean));
  
  console.log(`📊 Found ${existingGovernorates.length} existing governorates`);
  
  const govData = readGeoJSONFile('gov');
  const newGovernorates: InsertGovernorate[] = [];
  let skippedCount = 0;

  for (const feature of govData.features) {
    const props = feature.properties;
    const admin1Pcod = props.admin1Pcod?.toString();
    const admin1Name = props.admin1Name;
    const admin1NameAr = props.admin1Na_1;
    
    if (!admin1Pcod) {
      skippedCount++;
      continue;
    }

    if (existingCodes.has(admin1Pcod)) {
      skippedCount++;
      continue;
    }

    newGovernorates.push({
      code: admin1Pcod,
      nameAr: admin1NameAr || admin1Name || `محافظة ${admin1Pcod}`,
      nameEn: admin1Name || `Governorate ${admin1Pcod}`,
      geometry: feature.geometry,
      properties: props,
      isActive: true
    });
  }

  // Insert in batches
  let insertedCount = 0;
  const batches = chunk(newGovernorates, BATCH_SIZE);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      await db.insert(governorates).values(batch);
      insertedCount += batch.length;
      
      if (insertedCount % PROGRESS_INTERVAL === 0 || i === batches.length - 1) {
        console.log(`✅ Processed ${insertedCount}/${newGovernorates.length} governorates`);
      }
    } catch (error) {
      console.error(`❌ Error inserting batch ${i}:`, error);
    }
  }

  console.log(`🎯 Governorates summary: ${insertedCount} inserted, ${skippedCount} skipped`);
}

// Function to seed districts (المديريات) from dis.geojson
async function seedDistricts() {
  console.log('🌱 Seeding districts (مديريات)...');
  
  // Preload existing data
  const existingDistricts = await db.select({ id: districts.id, code: districts.code }).from(districts);
  const existingCodes = new Set(existingDistricts.map(d => d.code).filter(Boolean));
  
  const allGovernorates = await db.select({ id: governorates.id, code: governorates.code }).from(governorates);
  const governorateMap = createLookupMap(allGovernorates);
  
  console.log(`📊 Found ${allGovernorates.length} governorates, ${existingDistricts.length} existing districts`);
  
  const distData = readGeoJSONFile('dis');
  const newDistricts: InsertDistrict[] = [];
  let skippedCount = 0;

  for (const feature of distData.features) {
    const props = feature.properties;
    const admin2Pcod = props.admin2Pcod?.toString();
    const admin1Pcod = props.admin1Pcod?.toString(); // للربط بالمحافظة
    const admin2Name = props.admin2Name;
    const admin2NameAr = props.admin2Na_1;
    
    if (!admin2Pcod || !admin1Pcod) {
      skippedCount++;
      continue;
    }

    if (existingCodes.has(admin2Pcod)) {
      skippedCount++;
      continue;
    }

    const governorateId = governorateMap.get(admin1Pcod);
    if (!governorateId) {
      skippedCount++;
      continue;
    }

    newDistricts.push({
      code: admin2Pcod,
      nameAr: admin2NameAr || admin2Name || `مديرية ${admin2Pcod}`,
      nameEn: admin2Name || `District ${admin2Pcod}`,
      governorateId: governorateId,
      geometry: feature.geometry,
      properties: props,
      isActive: true
    });
  }

  // Insert in batches
  let insertedCount = 0;
  const batches = chunk(newDistricts, BATCH_SIZE);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      await db.insert(districts).values(batch);
      insertedCount += batch.length;
      
      if (insertedCount % PROGRESS_INTERVAL === 0 || i === batches.length - 1) {
        console.log(`✅ Processed ${insertedCount}/${newDistricts.length} districts`);
      }
    } catch (error) {
      console.error(`❌ Error inserting batch ${i}:`, error);
    }
  }

  console.log(`🎯 Districts summary: ${insertedCount} inserted, ${skippedCount} skipped`);
}

// Function to seed sub-districts (العزل) from azafinall.geojson  
async function seedSubDistricts() {
  console.log('🌱 Seeding sub-districts (عزل)...');
  
  // Preload existing data
  const existingSubDistricts = await db.select({ id: subDistricts.id, code: subDistricts.code }).from(subDistricts);
  const existingCodes = new Set(existingSubDistricts.map(s => s.code).filter(Boolean));
  
  const allDistricts = await db.select({ id: districts.id, code: districts.code }).from(districts);
  const districtMap = createLookupMap(allDistricts);
  
  console.log(`📊 Found ${allDistricts.length} districts, ${existingSubDistricts.length} existing sub-districts`);
  
  const azalData = readGeoJSONFile('azafinall');
  const newSubDistricts: InsertSubDistrict[] = [];
  let skippedCount = 0;

  for (const feature of azalData.features) {
    const props = feature.properties;
    // Multi-key fallbacks for sub-district code
    const admin3Pcod = getProp(props, ['admin3Pcod', 'admin3pcod', 'azalcode', 'AZALCODE']);
    // Multi-key fallbacks for district link
    const admin2Pcod = getProp(props, ['admin2Pcod', 'admin2pcod', 'ADM2_PCODE', 'admin2_pco']);
    // Multi-key fallbacks for name
    const admin3Name = getProp(props, ['admin3Name', 'admin3name', 'name_en', 'NAME_EN']);
    const admin3NameAr = getProp(props, ['admin3Na_1', 'admin3na_1', 'name_ar', 'NAME_AR']) || 'عزلة غير محددة';
    
    if (!admin3Pcod || !admin2Pcod) {
      skippedCount++;
      continue;
    }

    if (existingCodes.has(admin3Pcod)) {
      skippedCount++;
      continue;
    }

    const districtId = districtMap.get(admin2Pcod);
    if (!districtId) {
      skippedCount++;
      continue;
    }

    newSubDistricts.push({
      code: admin3Pcod,
      nameAr: admin3NameAr || admin3Name || `عزلة ${admin3Pcod}`,
      nameEn: admin3Name || `Sub-district ${admin3Pcod}`,
      districtId: districtId,
      geometry: feature.geometry,
      properties: props,
      isActive: true
    });
  }

  // Insert in batches
  let insertedCount = 0;
  const batches = chunk(newSubDistricts, BATCH_SIZE);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      await db.insert(subDistricts).values(batch);
      insertedCount += batch.length;
      
      if (insertedCount % PROGRESS_INTERVAL === 0 || i === batches.length - 1) {
        console.log(`✅ Processed ${insertedCount}/${newSubDistricts.length} sub-districts`);
      }
    } catch (error) {
      console.error(`❌ Error inserting batch ${i}:`, error);
    }
  }

  console.log(`🎯 Sub-districts summary: ${insertedCount} inserted, ${skippedCount} skipped`);
  
  // Create lookup map for the newly inserted sub-districts
  const allSubDistrictsAfter = await db.select({ id: subDistricts.id, code: subDistricts.code }).from(subDistricts);
  return createLookupMap(allSubDistrictsAfter);
}

// Function to seed sectors (القطاعات) from sctorfinal.geojson - مرتبطة بالعزل  
async function seedSectors(subDistrictMap: Map<string, string>) {
  console.log('🌱 Seeding sectors...');
  
  // Preload existing data
  const existingSectors = await db.select({ id: sectors.id, code: sectors.code }).from(sectors);
  const existingCodes = new Set(existingSectors.map(s => s.code).filter(Boolean));
  
  // Build enhanced sub-district lookup map by azalcode from properties
  const allSubDistricts = await db.select({ 
    id: subDistricts.id, 
    code: subDistricts.code, 
    properties: subDistricts.properties 
  }).from(subDistricts);
  
  const azalcodeToIdMap = new Map<string, string>();
  for (const sd of allSubDistricts) {
    const azalcode = (sd.properties as any)?.azalcode;
    if (azalcode) {
      azalcodeToIdMap.set(String(azalcode), sd.id);
    }
  }
  
  console.log(`📊 Found ${azalcodeToIdMap.size} sub-districts with azalcode, ${existingSectors.length} existing sectors`);
  
  const sectorsData = readGeoJSONFile('sctorfinal');
  const newSectors: InsertSector[] = [];
  let skippedCount = 0;

  for (const feature of sectorsData.features) {
    const props = feature.properties;
    // Multi-key fallbacks for sector code
    const discode = getProp(props, ['discode', 'DISCODE', 'Zone_', 'TARGET_FID']) || getProp(props, ['citycode', 'CITYCODE']);
    // Multi-key fallbacks for sub-district link via azalcode
    const azalcode = getProp(props, ['azalcode', 'AZALCODE']);
    // Multi-key fallbacks for name
    const sectorName = getProp(props, ['Zone_', 'admin3Name', 'admin2name', 'admin2na_1']) || `قطاع ${discode}`;
    
    if (!discode || !azalcode) {
      skippedCount++;
      continue;
    }

    if (existingCodes.has(String(discode))) {
      skippedCount++;
      continue;
    }

    // Look up sub-district by azalcode from properties
    const subDistrictId = azalcodeToIdMap.get(String(azalcode));
    if (!subDistrictId) {
      skippedCount++;
      continue;
    }

    newSectors.push({
      code: String(discode),
      nameAr: sectorName || `قطاع ${discode}`,
      nameEn: props.admin3Name || props.admin2name || `Sector ${discode}`,
      subDistrictId: subDistrictId, // مرتبط بالعزلة عبر azalcode
      sectorType: 'planning',
      geometry: feature.geometry,
      properties: props,
      isActive: true
    });
  }

  // Insert in batches
  let insertedCount = 0;
  const batches = chunk(newSectors, BATCH_SIZE);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      await db.insert(sectors).values(batch);
      insertedCount += batch.length;
      
      if (insertedCount % PROGRESS_INTERVAL === 0 || i === batches.length - 1) {
        console.log(`✅ Processed ${insertedCount}/${newSectors.length} sectors`);
      }
    } catch (error) {
      console.error(`❌ Error inserting batch ${i}:`, error);
    }
  }

  console.log(`🎯 Sectors summary: ${insertedCount} inserted, ${skippedCount} skipped`);
  
  // Create lookup map for the newly inserted sectors
  const allSectorsAfter = await db.select({ id: sectors.id, code: sectors.code }).from(sectors);
  return createLookupMap(allSectorsAfter);
}

// Function to validate geometry data before spatial operations
async function validateGeometry(geometry: any, unitId: string): Promise<{ isValid: boolean; reason?: string }> {
  if (!geometry) {
    return { isValid: false, reason: 'Missing geometry' };
  }
  
  if (!geometry.type || !geometry.coordinates) {
    return { isValid: false, reason: 'Invalid GeoJSON structure' };
  }
  
  try {
    const geometryJson = JSON.stringify(geometry);
    const validationResult = await sql`
      SELECT ST_IsValid(ST_GeomFromGeoJSON(${geometryJson})) as is_valid,
             ST_IsValidReason(ST_GeomFromGeoJSON(${geometryJson})) as reason
    `;
    
    if (validationResult && validationResult.length > 0) {
      const isValid = validationResult[0].is_valid;
      const reason = validationResult[0].reason;
      return { isValid, reason: isValid ? undefined : reason };
    }
  } catch (error) {
    return { isValid: false, reason: `Validation query failed: ${error}` };
  }
  
  return { isValid: false, reason: 'Unknown validation error' };
}

// Function to find sector for a unit using spatial relationship with 3-tier fallback strategy
async function findSectorForUnit(unitGeometry: any, unitId: string, spatialStats: any): Promise<string | null> {
  const unitGeometryJson = JSON.stringify(unitGeometry);
  
  try {
    // Primary strategy: Find sector with largest intersection area
    const primaryResult = await sql`
      WITH unit AS (
        SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${unitGeometryJson}), 4326)) AS g
      ), cand AS (
        SELECT s.id,
               ST_Area(ST_Intersection(
                 ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON((s.geometry)::text), 4326)),
                 (SELECT g FROM unit)
               )::geography) AS ia
        FROM sectors s
        WHERE ST_Intersects(
          ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON((s.geometry)::text), 4326)),
          (SELECT g FROM unit)
        )
      )
      SELECT id FROM cand WHERE ia > 0 ORDER BY ia DESC NULLS LAST LIMIT 1;
    `;
    
    if (primaryResult && primaryResult.length > 0) {
      spatialStats.primary++;
      return primaryResult[0].id as string;
    }

    // Fallback 1: Find sector containing centroid
    const fallback1Result = await sql`
      WITH unit AS (
        SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${unitGeometryJson}), 4326)) AS g
      )
      SELECT s.id 
      FROM sectors s, (SELECT ST_Centroid((SELECT g FROM unit)) c) t
      WHERE ST_Contains(
        ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON((s.geometry)::text), 4326)), 
        t.c
      )
      LIMIT 1;
    `;
    
    if (fallback1Result && fallback1Result.length > 0) {
      spatialStats.fallback1++;
      console.log(`🔄 Unit ${unitId}: Used centroid containment fallback`);
      return fallback1Result[0].id as string;
    }

    // Fallback 2: Find nearest sector by distance to centroid
    const fallback2Result = await sql`
      WITH unit AS (
        SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${unitGeometryJson}), 4326)) AS g
      )
      SELECT s.id 
      FROM sectors s, (SELECT ST_Centroid((SELECT g FROM unit)) c) t
      ORDER BY ST_Distance(
        ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON((s.geometry)::text), 4326)), 
        t.c
      ) ASC 
      LIMIT 1;
    `;
    
    if (fallback2Result && fallback2Result.length > 0) {
      spatialStats.fallback2++;
      console.log(`🔄 Unit ${unitId}: Used nearest distance fallback`);
      return fallback2Result[0].id as string;
    }

    // All fallbacks failed
    spatialStats.failed++;
    console.error(`❌ Unit ${unitId}: All spatial strategies failed`);

  } catch (error) {
    spatialStats.errors++;
    console.error(`❌ Unit ${unitId}: Spatial query error:`, error);
  }
  
  return null;
}

// Function to seed neighborhood units (وحدات الجوار) from unitsfinal.geojson using spatial relationships
async function seedNeighborhoodUnits() {
  console.log('🌱 Seeding neighborhood units using spatial relationships...');
  
  // Preload existing data
  const existingUnits = await db.select({ id: neighborhoodUnits.id, code: neighborhoodUnits.code }).from(neighborhoodUnits);
  const existingCodes = new Set(existingUnits.map(u => u.code).filter(Boolean));
  
  const sectorsCount = await db.select({ count: drizzleSql`count(*)` }).from(sectors);
  console.log(`📊 Found ${sectorsCount[0].count} sectors, ${existingUnits.length} existing units`);
  
  const unitsData = readGeoJSONFile('unitsfinal');
  const newUnits: InsertNeighborhoodUnit[] = [];
  let skippedCount = 0;
  let spatialLinkageStats = {
    primary: 0,
    fallback1: 0,
    fallback2: 0,
    failed: 0,
    errors: 0,
    invalidGeometry: 0,
    repaired: 0
  };

  console.log(`📖 Processing ${unitsData.features.length} neighborhood units from GeoJSON...`);

  for (let i = 0; i < unitsData.features.length; i++) {
    const feature = unitsData.features[i];
    const props = feature.properties;
    
    // Multi-key fallbacks for unit ID
    const uniqueUnitId = getProp(props, ['unique_unit_id', 'unique_uni', 'UNIQUE_UNI']);
    // Use the specific column for neighborhood unit name
    const nameAr = getProp(props, ['ÑÞã_æÍÏÉ_Ç']) || 'وحدة جوار غير مسماة';
    
    // Validate required data
    if (!uniqueUnitId || !feature.geometry) {
      skippedCount++;
      continue;
    }

    if (existingCodes.has(uniqueUnitId)) {
      skippedCount++;
      continue;
    }

    // Validate geometry before spatial operations
    const geometryValidation = await validateGeometry(feature.geometry, uniqueUnitId);
    if (!geometryValidation.isValid) {
      console.warn(`⚠️ Unit ${uniqueUnitId}: Invalid geometry - ${geometryValidation.reason}`);
      spatialLinkageStats.invalidGeometry++;
      skippedCount++;
      continue;
    }

    // Use spatial relationship to find the matching sector
    const sectorId = await findSectorForUnit(feature.geometry, uniqueUnitId, spatialLinkageStats);
    if (!sectorId) {
      skippedCount++;
      continue;
    }

    newUnits.push({
      code: uniqueUnitId,
      nameAr: nameAr,
      nameEn: `Neighborhood Unit ${uniqueUnitId}`,
      sectorId: sectorId,
      neighborhoodId: null, // To be linked later when neighborhoods are populated
      geometry: feature.geometry,
      properties: props,
      isActive: true
    });

    // Progress logging
    if ((i + 1) % 100 === 0 || i === unitsData.features.length - 1) {
      console.log(`🔄 Processed ${i + 1}/${unitsData.features.length} units (${newUnits.length} valid, ${skippedCount} skipped)`);
    }
  }

  // Insert in batches using transactions for reliability
  let insertedCount = 0;
  const batches = chunk(newUnits, BATCH_SIZE);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      await db.insert(neighborhoodUnits).values(batch);
      insertedCount += batch.length;
      
      if (insertedCount % PROGRESS_INTERVAL === 0 || i === batches.length - 1) {
        console.log(`✅ Inserted ${insertedCount}/${newUnits.length} neighborhood units`);
      }
    } catch (error) {
      console.error(`❌ Error inserting batch ${i + 1}/${batches.length}:`, error);
    }
  }

  console.log(`🎯 Neighborhood units summary: ${insertedCount} inserted, ${skippedCount} skipped`);
  console.log(`📊 Spatial linkage statistics:`, spatialLinkageStats);
  
  // Create lookup map for the newly inserted neighborhood units
  const allUnitsAfter = await db.select({ id: neighborhoodUnits.id, code: neighborhoodUnits.code }).from(neighborhoodUnits);
  return createLookupMap(allUnitsAfter);
}

// Function to seed blocks (البلوكات) from blocksfinal.geojson
async function seedBlocks(unitMap: Map<string, string>) {
  console.log('🌱 Seeding blocks...');
  
  // Preload existing data
  const existingBlocks = await db.select({ id: blocks.id, code: blocks.code }).from(blocks);
  const existingCodes = new Set(existingBlocks.map(b => b.code).filter(Boolean));
  
  console.log(`📊 Found ${unitMap.size} neighborhood units, ${existingBlocks.length} existing blocks`);
  
  const blocksData = readGeoJSONFile('blocksfinal');
  const newBlocks: InsertBlock[] = [];
  let skippedCount = 0;

  for (const feature of blocksData.features) {
    const props = feature.properties;
    // Multi-key fallbacks for block ID
    const blockId = getProp(props, ['Id', 'ID', 'id', 'block_id']);
    // Multi-key fallbacks for unit link
    const uniqueUnitId = getProp(props, ['unique_unit_id', 'unique_uni', 'UNIQUE_UNI']);
    
    if (!blockId || !uniqueUnitId) {
      skippedCount++;
      continue;
    }

    const blockCode = `${uniqueUnitId}-${blockId}`;
    
    if (existingCodes.has(blockCode)) {
      skippedCount++;
      continue;
    }

    const neighborhoodUnitId = unitMap.get(uniqueUnitId);
    if (!neighborhoodUnitId) {
      skippedCount++;
      continue;
    }

    newBlocks.push({
      code: blockCode,
      nameAr: `بلوك ${blockId}`,
      nameEn: `Block ${blockId}`,
      neighborhoodUnitId: neighborhoodUnitId,
      blockType: 'residential',
      geometry: feature.geometry,
      properties: props,
      isActive: true
    });
  }

  // Insert in batches
  let insertedCount = 0;
  const batches = chunk(newBlocks, BATCH_SIZE);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      await db.insert(blocks).values(batch);
      insertedCount += batch.length;
      
      if (insertedCount % PROGRESS_INTERVAL === 0 || i === batches.length - 1) {
        console.log(`✅ Processed ${insertedCount}/${newBlocks.length} blocks`);
      }
    } catch (error) {
      console.error(`❌ Error inserting batch ${i}:`, error);
    }
  }

  console.log(`🎯 Blocks summary: ${insertedCount} inserted, ${skippedCount} skipped`);
}

// Function to check prerequisites
async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  const governorateCount = await db.select().from(governorates);
  const districtCount = await db.select().from(districts);
  
  console.log(`📊 Found ${governorateCount.length} governorates, ${districtCount.length} districts`);
  
  if (governorateCount.length === 0) {
    console.warn('⚠️  No governorates found - sectors may not be linked properly');
  }
  
  if (districtCount.length === 0) {
    console.warn('⚠️  No districts found - sub-districts may not be linked properly');
  }
  
  return { governorates: governorateCount.length, districts: districtCount.length };
}

// CLI argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const entityArg = args.find(arg => ['governorates', 'districts', 'subdistricts', 'sectors', 'units', 'blocks', 'all'].includes(arg));
  return {
    entity: entityArg || 'all',
    help: args.includes('--help') || args.includes('-h')
  };
}

// Main seeding function
async function main() {
  const { entity, help } = parseArgs();
  
  if (help) {
    console.log(`
🌱 Geographic Data Seeding Script

Usage: tsx seed-geo-data.ts [entity]

Entities:
  governorates  - Seed governorates only (محافظات)
  districts     - Seed districts only (مديريات)
  subdistricts  - Seed sub-districts only (عزل)
  sectors       - Seed sectors only (قطاعات)
  units         - Seed neighborhood units only (وحدات الجوار)
  blocks        - Seed blocks only (بلوكات)
  all           - Seed all entities (default)

Examples:
  tsx seed-geo-data.ts
  tsx seed-geo-data.ts sectors
  tsx seed-geo-data.ts all
`);
    return;
  }
  
  console.log('🚀 Starting geographic data seeding...');
  console.log(`📂 Target entity: ${entity}`);
  
  try {
    const prerequisites = await checkPrerequisites();
    
    if (entity === 'all') {
      await seedGovernorates();
      await seedDistricts();
      const subDistrictMap = await seedSubDistricts();
      const sectorMap = await seedSectors(subDistrictMap);
      const unitMap = await seedNeighborhoodUnits();
      await seedBlocks(unitMap);
    } else if (entity === 'governorates') {
      await seedGovernorates();
    } else if (entity === 'districts') {
      await seedDistricts();
    } else if (entity === 'subdistricts') {
      await seedSubDistricts();
    } else if (entity === 'sectors') {
      // Need sub-district map for sectors
      const allSubDistricts = await db.select({ id: subDistricts.id, code: subDistricts.code }).from(subDistricts);
      const subDistrictMap = createLookupMap(allSubDistricts);
      await seedSectors(subDistrictMap);
    } else if (entity === 'units') {
      await seedNeighborhoodUnits();
    } else if (entity === 'blocks') {
      // Need unit map for blocks
      const allUnits = await db.select({ id: neighborhoodUnits.id, code: neighborhoodUnits.code }).from(neighborhoodUnits);
      const unitMap = createLookupMap(allUnits);
      await seedBlocks(unitMap);
    }
    
    console.log('🎉 Geographic data seeding completed successfully!');
  } catch (error) {
    console.error('💥 Error during seeding:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// ESM-safe entry point
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}