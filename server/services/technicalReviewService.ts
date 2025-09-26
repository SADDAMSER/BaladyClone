import { db } from '../db';
import { 
  technicalReviewCases, 
  reviewArtifacts, 
  ingestionJobs, 
  rasterProducts,
  applications,
  mobileSurveyGeometries,
  mobileSurveySessions,
  users,
  geoJobs
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { storage } from '../storage';
import { ObjectStorageService } from '../objectStorage';

/**
 * خدمة المراجعة الفنية - المهمة 1.2
 * تدير المراجعة الفنية للطلبات مع دعم PostGIS وثلاث مسارات لاستقبال البيانات
 */
export class TechnicalReviewService {

  /**
   * إنشاء حالة مراجعة فنية جديدة
   */
  async createReviewCase(
    applicationId: string,
    reviewerId: string,
    assignedById: string,
    priority: 'high' | 'medium' | 'low' = 'medium',
    reviewType: 'technical' | 'legal' | 'administrative' = 'technical'
  ): Promise<any> {
    try {
      // التحقق من عدم وجود حالة مراجعة نشطة
      const existingCase = await db
        .select()
        .from(technicalReviewCases)
        .where(and(
          eq(technicalReviewCases.applicationId, applicationId),
          eq(technicalReviewCases.status, 'pending')
        ))
        .limit(1);

      if (existingCase.length > 0) {
        console.log(`⚠️ Active review case already exists for application ${applicationId}`);
        return existingCase[0];
      }

      // إنشاء حالة مراجعة جديدة
      const [reviewCase] = await db
        .insert(technicalReviewCases)
        .values({
          id: randomUUID(),
          applicationId,
          reviewerId,
          assignedById,
          priority,
          reviewType,
          status: 'pending',
          workflowStage: 'technical_review_pending',
          reviewVersion: 1
        })
        .returning();

      console.log(`✅ Technical review case created for application ${applicationId}`);
      return reviewCase;

    } catch (error) {
      console.error('❌ Error creating review case:', error);
      throw error;
    }
  }

  /**
   * المسار الأول: استيراد البيانات من mobile_survey_geometries مباشرة
   */
  async importFromMobileSurvey(
    reviewCaseId: string,
    applicationId: string
  ): Promise<any> {
    try {
      console.log(`🔄 Starting mobile survey import for application ${applicationId}`);

      // إنشاء مهمة استيراد
      const [ingestionJob] = await db
        .insert(ingestionJobs)
        .values({
          reviewCaseId,
          jobType: 'mobile_sync',
          jobName: 'Mobile Survey Data Import',
          description: 'Import geometries from mobile survey data',
          status: 'running',
          progress: '0'
        })
        .returning();

      // البحث عن البيانات الجغرافية من المسح الميداني للطلب المحدد
      const surveyResults = await db
        .select({
          geometry: mobileSurveyGeometries,
          session: mobileSurveySessions
        })
        .from(mobileSurveyGeometries)
        .innerJoin(mobileSurveySessions, eq(mobileSurveyGeometries.sessionId, mobileSurveySessions.id))
        .where(and(
          eq(mobileSurveySessions.applicationId, applicationId),
          sql`${mobileSurveyGeometries.coordinates} IS NOT NULL`
        ));

      let recordsProcessed = 0;
      let recordsValid = 0;
      let artifactsCreated = 0;

      // معالجة كل geometry
      for (const row of surveyResults) {
        try {
          recordsProcessed++;
          const geometry = row.geometry;

          // التحقق من صحة البيانات الجغرافية
          const geoJsonGeometry = {
            type: geometry.geometryType,
            coordinates: geometry.coordinates
          };
          const isValid = await this.validateGeoJSONGeometry(geoJsonGeometry, geometry.crs || 'EPSG:4326');
          
          if (isValid) {
            recordsValid++;

            // إنشاء artifact
            const [artifact] = await db
              .insert(reviewArtifacts)
              .values({
                reviewCaseId,
                ingestionJobId: ingestionJob.id,
                artifactName: `Mobile Survey Geometry ${geometry.geometryNumber}`,
                artifactType: 'geometry',
                sourceType: 'mobile_sync',
                geometryType: geometry.geometryType,
                coordinates: geoJsonGeometry,
                properties: {
                  ...(geometry.properties as object || {}),
                  originalId: geometry.id,
                  featureType: geometry.featureType,
                  featureCode: geometry.featureCode
                },
                crs: geometry.crs || 'EPSG:4326',
                validationStatus: 'valid'
              })
              .returning();

            artifactsCreated++;
            console.log(`📍 Created artifact from geometry ${row.geometry.id}`);
          }

          // تحديث التقدم
          const progress = Math.round((recordsProcessed / surveyResults.length) * 100);
          await this.updateJobProgress(ingestionJob.id, progress.toString());

        } catch (error) {
          console.error(`❌ Error processing geometry ${row.geometry.id}:`, error);
        }
      }

      // إنهاء المهمة
      await db
        .update(ingestionJobs)
        .set({
          status: 'completed',
          progress: '100',
          completedAt: new Date()
        })
        .where(eq(ingestionJobs.id, ingestionJob.id));

      console.log(`✅ Mobile survey import completed: ${artifactsCreated} artifacts created`);
      return { ingestionJob, artifactsCreated, recordsProcessed, recordsValid };

    } catch (error) {
      console.error('❌ Error importing from mobile survey:', error);
      throw error;
    }
  }

  /**
   * المسار الثاني: تحميل ومعالجة ملف CSV
   */
  async processCsvUpload(
    reviewCaseId: string,
    fileBuffer: Buffer,
    fileName: string,
    mappingConfig: any
  ): Promise<any> {
    try {
      console.log(`📄 Processing CSV file: ${fileName}`);

      // إنشاء مهمة معالجة
      const [ingestionJob] = await db
        .insert(ingestionJobs)
        .values({
          reviewCaseId,
          jobType: 'csv_processing',
          jobName: `CSV Processing: ${fileName}`,
          description: `Process CSV file: ${fileName}`,
          sourceFormat: 'csv',
          outputFormat: 'geojson',
          status: 'running',
          progress: '0',
          processingConfig: {
            fileName,
            mappingConfig,
            fileSize: fileBuffer.length
          }
        })
        .returning();

      // تحليل محتوى CSV
      const csvData = await this.parseCsvData(fileBuffer, mappingConfig);
      
      let recordsProcessed = 0;
      let recordsValid = 0;
      let artifactsCreated = 0;

      // معالجة كل سجل
      for (const record of csvData) {
        try {
          recordsProcessed++;

          // تحويل إلى geometry مع PostGIS
          const geometryResult = await this.convertCsvToGeometry(record, mappingConfig);
          
          if (geometryResult.isValid) {
            recordsValid++;

            // إنشاء artifact
            await db
              .insert(reviewArtifacts)
              .values({
                reviewCaseId,
                ingestionJobId: ingestionJob.id,
                artifactName: `CSV Record ${recordsProcessed}`,
                artifactType: 'geometry',
                sourceType: 'csv_upload',
                geometryType: geometryResult.type,
                coordinates: geometryResult.geoJson,
                crs: mappingConfig.coordinateSystem || 'EPSG:4326',
                properties: {
                  originalRecord: record,
                  mappingUsed: mappingConfig,
                  conversionDetails: geometryResult.details
                },
                validationStatus: 'valid'
              });

            artifactsCreated++;
          }

          // تحديث التقدم
          const progress = Math.round((recordsProcessed / csvData.length) * 100);
          await this.updateJobProgress(ingestionJob.id, progress.toString());

        } catch (error) {
          console.error(`❌ Error processing CSV record ${recordsProcessed}:`, error);
        }
      }

      // إنهاء المهمة
      await db
        .update(ingestionJobs)
        .set({
          status: 'completed',
          progress: '100',
          completedAt: new Date()
        })
        .where(eq(ingestionJobs.id, ingestionJob.id));

      console.log(`✅ CSV processing completed: ${artifactsCreated} geometries created`);
      return { ingestionJob, artifactsCreated, recordsProcessed, recordsValid };

    } catch (error) {
      console.error('❌ Error processing CSV upload:', error);
      throw error;
    }
  }

  /**
   * المسار الثالث: تحميل ومعالجة Shapefile
   */
  async processShapefileUpload(
    reviewCaseId: string,
    shapefileBuffer: Buffer,
    fileName: string
  ): Promise<any> {
    try {
      console.log(`🗺️ Processing Shapefile: ${fileName}`);

      // إنشاء مهمة معالجة
      const [ingestionJob] = await db
        .insert(ingestionJobs)
        .values({
          reviewCaseId,
          jobType: 'shapefile_processing',
          jobName: `Shapefile Processing: ${fileName}`,
          description: `Process shapefile: ${fileName}`,
          sourceFormat: 'shp',
          outputFormat: 'postgis',
          status: 'running',
          progress: '0',
          processingConfig: {
            fileName,
            fileSize: shapefileBuffer.length
          }
        })
        .returning();

      // استخراج البيانات من Shapefile باستخدام PostGIS
      const features = await this.extractShapefileFeatures(shapefileBuffer);
      
      let recordsProcessed = 0;
      let recordsValid = 0;
      let artifactsCreated = 0;

      // معالجة كل feature
      for (const feature of features) {
        try {
          recordsProcessed++;

          // التحقق من صحة الgeometry
          const isValid = await this.validateGeoJSONGeometry(feature.geometry, feature.crs);
          
          if (isValid) {
            recordsValid++;

            // إنشاء artifact
            await db
              .insert(reviewArtifacts)
              .values({
                reviewCaseId,
                ingestionJobId: ingestionJob.id,
                artifactName: `Shapefile Feature ${recordsProcessed}`,
                artifactType: 'geometry',
                sourceType: 'shapefile_upload',
                geometryType: feature.geometryType,
                coordinates: feature.geometry,
                crs: feature.crs,
                properties: {
                  attributes: feature.properties,
                  originalFeatureId: feature.id,
                  shapefileInfo: {
                    fileName,
                    layerName: feature.layerName
                  }
                },
                validationStatus: 'valid'
              });

            artifactsCreated++;
          }

          // تحديث التقدم
          const progress = Math.round((recordsProcessed / features.length) * 100);
          await this.updateJobProgress(ingestionJob.id, progress.toString());

        } catch (error) {
          console.error(`❌ Error processing feature ${recordsProcessed}:`, error);
        }
      }

      // إنهاء المهمة
      await db
        .update(ingestionJobs)
        .set({
          status: 'completed',
          progress: '100',
          completedAt: new Date()
        })
        .where(eq(ingestionJobs.id, ingestionJob.id));

      console.log(`✅ Shapefile processing completed: ${artifactsCreated} features imported`);
      return { ingestionJob, artifactsCreated, recordsProcessed, recordsValid };

    } catch (error) {
      console.error('❌ Error processing shapefile upload:', error);
      throw error;
    }
  }

  /**
   * معالجة الصور الجغرافية المرجعة (GeoTIFF)
   * التكامل مع نظام geo_jobs للمعالجة بواسطة Python worker
   */
  async processGeoRasterUpload(
    reviewCaseId: string,
    rasterBuffer: Buffer,
    fileName: string,
    rasterMetadata: any
  ): Promise<any> {
    try {
      console.log(`🖼️ Processing GeoTIFF: ${fileName}`);

      // إنشاء مهمة معالجة raster للتتبع الداخلي
      const [ingestionJob] = await db
        .insert(ingestionJobs)
        .values({
          reviewCaseId,
          jobType: 'georaster_processing',
          jobName: `GeoTIFF Processing: ${fileName}`,
          description: `Process GeoTIFF: ${fileName}`,
          sourceFormat: 'tiff',
          outputFormat: 'png',
          status: 'running',
          progress: '10',
          processingConfig: {
            fileName,
            fileSize: rasterBuffer.length,
            metadata: rasterMetadata
          }
        })
        .returning();

      // تحليل البيانات الraster للمعاينة السريعة
      const rasterInfo = await this.analyzeGeoRaster(rasterBuffer, rasterMetadata);

      // إنشاء منتج raster مع حالة "processing"
      const [rasterProduct] = await db
        .insert(rasterProducts)
        .values({
          reviewCaseId,
          ingestionJobId: ingestionJob.id,
          productName: `${fileName} - Processed`,
          productType: rasterInfo.productType,
          description: `Processed GeoTIFF from technical review`,
          imageUrl: `/raster/${fileName}.png`, // سيتم تحديثه بعد المعالجة
          crs: rasterInfo.crs,
          bounds: rasterInfo.bounds,
          centroid: rasterInfo.centroid,
          width: rasterInfo.width,
          height: rasterInfo.height,
          pixelSizeX: rasterInfo.pixelSizeX,
          pixelSizeY: rasterInfo.pixelSizeY,
          resolution: rasterInfo.resolution,
          bandCount: rasterInfo.bandCount,
          dataType: rasterInfo.dataType,
          processingLevel: 'processing',
          status: 'processing'
        })
        .returning();

      // رفع الملف إلى Object Storage للمعالجة بواسطة Python worker
      const objectStorageService = new ObjectStorageService();
      const inputFileName = `technical-review/${reviewCaseId}/raster-input-${Date.now()}-${fileName}`;
      
      await objectStorageService.uploadFile(
        inputFileName,
        rasterBuffer,
        {
          contentType: 'image/tiff',
          metadata: {
            originalName: fileName,
            reviewCaseId: reviewCaseId,
            rasterProductId: rasterProduct.id,
            uploadedAt: new Date().toISOString()
          }
        }
      );

      console.log(`📤 Uploaded raster file to Object Storage: ${inputFileName}`);

      // إنشاء geo_job للمعالجة بواسطة Python worker
      const geoJobData = {
        taskType: 'geotiff_processing',
        targetType: 'technical_review_case',
        targetId: reviewCaseId,
        payloadData: {
          fileName: fileName,
          inputFileKey: inputFileName,
          rasterProductId: rasterProduct.id,
          ingestionJobId: ingestionJob.id,
          processingConfig: {
            outputFormat: 'png',
            generateThumbnails: true,
            createWorldFile: true,
            targetCRS: 'EPSG:4326',
            compressionQuality: 85
          },
          metadata: rasterInfo
        },
        priority: 5, // Medium priority
        ownerId: 'system', // Technical review system user
        estimatedDuration: 300 // 5 minutes estimated
      };

      // استخدام storage layer لإنشاء geo_job
      const geoJob = await storage.createGeoJob(geoJobData);
      console.log(`🔄 Created geo_job for Python worker processing: ${geoJob.id}`);

      // تحديث التقدم
      await this.updateJobProgress(ingestionJob.id, '25');

      // ربط geo_job مع ingestion_job
      await db
        .update(ingestionJobs)
        .set({
          processingConfig: {
            ...ingestionJob.processingConfig,
            geoJobId: geoJob.id,
            inputFileKey: inputFileName
          },
          progress: '25'
        })
        .where(eq(ingestionJobs.id, ingestionJob.id));

      console.log(`✅ GeoTIFF upload and queueing completed. Processing will continue asynchronously.`);
      return { 
        ingestionJob: { ...ingestionJob, geoJobId: geoJob.id }, 
        rasterProduct, 
        geoJob,
        processingStatus: 'queued',
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
      };

    } catch (error) {
      console.error('❌ Error processing georaster upload:', error);
      throw error;
    }
  }

  /**
   * الحصول على جميع artifacts لحالة مراجعة
   */
  async getReviewArtifacts(reviewCaseId: string): Promise<any[]> {
    return await db
      .select()
      .from(reviewArtifacts)
      .where(eq(reviewArtifacts.reviewCaseId, reviewCaseId));
  }

  /**
   * الحصول على منتجات الraster لحالة مراجعة
   */
  async getRasterProducts(reviewCaseId: string): Promise<any[]> {
    return await db
      .select()
      .from(rasterProducts)
      .where(eq(rasterProducts.reviewCaseId, reviewCaseId));
  }

  /**
   * الحصول على حالة مراجعة بالتفاصيل الكاملة
   */
  async getReviewCaseDetails(reviewCaseId: string): Promise<any> {
    const reviewCase = await db
      .select()
      .from(technicalReviewCases)
      .where(eq(technicalReviewCases.id, reviewCaseId))
      .limit(1);

    if (reviewCase.length === 0) {
      throw new Error('Review case not found');
    }

    const artifacts = await this.getReviewArtifacts(reviewCaseId);
    const rasterProducts = await this.getRasterProducts(reviewCaseId);
    const jobs = await db
      .select()
      .from(ingestionJobs)
      .where(eq(ingestionJobs.reviewCaseId, reviewCaseId));

    return {
      reviewCase: reviewCase[0],
      artifacts,
      rasterProducts,
      ingestionJobs: jobs
    };
  }

  /**
   * تحديث قرار المراجعة الفنية
   */
  async updateReviewDecision(
    reviewCaseId: string,
    decision: 'approve' | 'reject' | 'modify' | 'return',
    reviewNotes: string,
    reviewerId: string
  ): Promise<any> {
    const status = decision === 'approve' ? 'approved' : 
                  decision === 'reject' ? 'rejected' : 'needs_modification';

    const [updated] = await db
      .update(technicalReviewCases)
      .set({
        decision,
        status,
        reviewNotes,
        completedAt: new Date(),
        updatedAt: new Date(),
        reviewVersion: sql`review_version + 1`
      })
      .where(eq(technicalReviewCases.id, reviewCaseId))
      .returning();

    console.log(`✅ Review decision updated: ${decision} for case ${reviewCaseId}`);
    return updated;
  }

  // ===== Helper Methods =====

  private async updateJobProgress(jobId: string, progress: string): Promise<void> {
    await db
      .update(ingestionJobs)
      .set({ progress })
      .where(eq(ingestionJobs.id, jobId));
  }

  private async validateGeometry(geometryWkt: string, crs: string): Promise<boolean> {
    try {
      const srid = parseInt(crs.replace('EPSG:', ''));
      const result = await db.execute(sql`SELECT ST_IsValid(ST_GeomFromText(${geometryWkt}, ${srid})) AS is_valid`);
      
      return result.rows[0]?.is_valid || false;
    } catch (error) {
      console.error('Geometry validation error:', error);
      return false;
    }
  }

  private async validateGeoJSONGeometry(geoJsonGeometry: any, crs: string): Promise<boolean> {
    try {
      const srid = parseInt(crs.replace('EPSG:', ''));
      const geoJson = JSON.stringify(geoJsonGeometry);
      const result = await db.execute(sql`SELECT ST_IsValid(ST_SetSRID(ST_GeomFromGeoJSON(${geoJson}), ${srid})) AS is_valid`);
      
      return result.rows[0]?.is_valid || false;
    } catch (error) {
      console.error('GeoJSON geometry validation error:', error);
      return false;
    }
  }

  private async parseCsvData(buffer: Buffer, mappingConfig: any): Promise<any[]> {
    try {
      const csvText = buffer.toString('utf-8');
      const lines = csvText.split('\n').filter(line => line.trim().length > 0);
      
      if (lines.length === 0) return [];
      
      // استخراج العناوين من السطر الأول
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data: any[] = [];
      
      // معالجة كل سطر
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length === headers.length) {
          const record: any = {};
          headers.forEach((header, index) => {
            record[header] = values[index];
          });
          data.push(record);
        }
      }
      
      return data;
    } catch (error) {
      console.error('CSV parsing error:', error);
      return [];
    }
  }

  private async convertCsvToGeometry(record: any, mappingConfig: any): Promise<any> {
    try {
      // استخراج الإحداثيات بناءً على التكوين
      const latField = mappingConfig.latitudeField || 'lat';
      const lngField = mappingConfig.longitudeField || 'lng';
      
      const lat = parseFloat(record[latField]);
      const lng = parseFloat(record[lngField]);
      
      if (isNaN(lat) || isNaN(lng)) {
        return { isValid: false, coordinates: null, type: 'Point', details: { error: 'Invalid coordinates' } };
      }
      
      // إنشاء Point GeoJSON
      const coordinates = [lng, lat]; // GeoJSON: [longitude, latitude]
      
      // التحقق من الصحة
      const pointGeometry = { type: 'Point', coordinates };
      const isValid = await this.validateGeoJSONGeometry(pointGeometry, mappingConfig.coordinateSystem || 'EPSG:4326');
      
      return {
        isValid,
        geoJson: pointGeometry,
        coordinates: coordinates, // Raw coordinates array
        type: 'Point',
        details: { originalLat: lat, originalLng: lng }
      };
    } catch (error) {
      return {
        isValid: false,
        geoJson: null,
        coordinates: null,
        type: 'Point',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async extractShapefileFeatures(buffer: Buffer): Promise<any[]> {
    try {
      // في البيئة الحقيقية، سنستخدم ogr2ogr أو مكتبة shapefile
      // هنا نعيد نموذج بيانات للاختبار
      console.log('⚠️ Shapefile extraction is a stub - needs ogr2ogr integration');
      
      // نموذج feature للاختبار
      const mockFeatures = [
        {
          id: 1,
          geometryType: 'Polygon',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [44.123, 15.456],
              [44.124, 15.456],
              [44.124, 15.457],
              [44.123, 15.457],
              [44.123, 15.456]
            ]]
          },
          properties: {
            name: 'Test Feature',
            area: 1000
          },
          crs: 'EPSG:4326',
          layerName: 'polygons'
        }
      ];
      
      return mockFeatures;
    } catch (error) {
      console.error('Shapefile extraction error:', error);
      return [];
    }
  }

  private async analyzeGeoRaster(buffer: Buffer, metadata: any): Promise<any> {
    try {
      // في البيئة الحقيقية، سنستخدم GDAL أو PostGIS RASTER
      console.log('⚠️ GeoTIFF analysis is a stub - needs GDAL integration');
      
      // تحليل أساسي من metadata المرسل
      const width = metadata.width || 1024;
      const height = metadata.height || 1024;
      const bounds = metadata.bounds || [44.0, 15.0, 45.0, 16.0]; // [minLng, minLat, maxLng, maxLat]
      
      const centroid = {
        lat: (bounds[1] + bounds[3]) / 2,
        lng: (bounds[0] + bounds[2]) / 2
      };
      
      const pixelSizeX = (bounds[2] - bounds[0]) / width;
      const pixelSizeY = (bounds[3] - bounds[1]) / height;
      
      return {
        productType: metadata.productType || 'orthophoto',
        crs: metadata.crs || 'EPSG:4326',
        bounds,
        centroid,
        width,
        height,
        pixelSizeX: pixelSizeX.toString(),
        pixelSizeY: pixelSizeY.toString(),
        resolution: Math.min(pixelSizeX, pixelSizeY).toString(),
        bandCount: metadata.bandCount || 3,
        dataType: metadata.dataType || 'uint8'
      };
    } catch (error) {
      console.error('GeoTIFF analysis error:', error);
      return {
        productType: 'orthophoto',
        crs: 'EPSG:4326',
        bounds: [44.0, 15.0, 45.0, 16.0],
        centroid: { lat: 15.5, lng: 44.5 },
        width: 1024,
        height: 1024,
        pixelSizeX: '0.001',
        pixelSizeY: '0.001',
        resolution: '0.001',
        bandCount: 3,
        dataType: 'uint8'
      };
    }
  }

  /**
   * فحص حالة معالجة GeoTIFF بواسطة Python worker
   */
  async checkGeoJobStatus(geoJobId: string): Promise<any> {
    try {
      const geoJob = await storage.getGeoJob(geoJobId);
      if (!geoJob) {
        throw new Error(`Geo job not found: ${geoJobId}`);
      }
      
      return {
        id: geoJob.id,
        status: geoJob.status,
        progress: geoJob.progress,
        taskType: geoJob.taskType,
        startedAt: geoJob.startedAt,
        completedAt: geoJob.completedAt,
        errorMessage: geoJob.errorMessage,
        outputKeys: geoJob.outputKeys,
        outputPayload: geoJob.outputPayload
      };
    } catch (error) {
      console.error('Error checking geo job status:', error);
      throw error;
    }
  }

  /**
   * تحديث raster product عند اكتمال المعالجة
   */
  async updateRasterProductFromGeoJob(geoJobId: string): Promise<any> {
    try {
      const geoJob = await storage.getGeoJob(geoJobId);
      if (!geoJob || geoJob.status !== 'completed') {
        throw new Error(`Geo job not completed: ${geoJobId}`);
      }

      const rasterProductId = geoJob.payloadData?.rasterProductId;
      if (!rasterProductId) {
        throw new Error('Raster product ID not found in geo job payload');
      }

      // الحصول على URLs للملفات المعالجة
      const objectStorageService = new ObjectStorageService();
      const outputKeys = geoJob.outputKeys || [];
      
      let imageUrl = null;
      let worldFileUrl = null;
      let projectionFileUrl = null;
      
      for (const key of outputKeys) {
        if (key.endsWith('.png')) {
          imageUrl = await objectStorageService.generateDownloadUrl(key, 24 * 60 * 60); // 24h expiry
        } else if (key.endsWith('.pgw') || key.endsWith('.pngw')) {
          worldFileUrl = await objectStorageService.generateDownloadUrl(key, 24 * 60 * 60);
        } else if (key.endsWith('.prj')) {
          projectionFileUrl = await objectStorageService.generateDownloadUrl(key, 24 * 60 * 60);
        }
      }

      // تحديث raster product بالنتائج
      const updatedProduct = await db
        .update(rasterProducts)
        .set({
          status: 'ready',
          imageUrl: imageUrl || `/raster/processed-${rasterProductId}.png`,
          worldFileUrl,
          projectionFileUrl,
          processingDate: new Date(),
          processingLevel: 'processed'
        })
        .where(eq(rasterProducts.id, rasterProductId))
        .returning();

      console.log(`✅ Updated raster product ${rasterProductId} with processing results`);
      return updatedProduct[0];
    } catch (error) {
      console.error('Error updating raster product from geo job:', error);
      throw error;
    }
  }
}

// Singleton instance
export const technicalReviewService = new TechnicalReviewService();