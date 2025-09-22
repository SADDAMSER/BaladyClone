#!/usr/bin/env node

/**
 * GeoTIFF Processing PoC Script
 * يحاكي العملية الكاملة لرفع ومعالجة ملفات GeoTIFF من جانب الخادم
 * 
 * الهدف: اختبار شامل للنظام بدءاً من المصادقة وحتى معالجة الملفات
 */

import fetch from 'node-fetch';
import { promises as fs } from 'fs';

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USERNAME = 'admin_test';
const NEIGHBORHOOD_UNIT_ID = '76e95e93-d841-4158-8cb7-94b9d435d313'; // وحدة الجوار 2A3
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 30; // 1 minute total

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${colors.bold}${colors.blue}🔄 Step ${step}:${colors.reset} ${message}`);
}

function logSuccess(message) {
  log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message) {
  log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

/**
 * Step 1: Authenticate and get JWT token
 */
async function authenticate() {
  logStep(1, 'المصادقة والحصول على JWT token');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/simple-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: TEST_USERNAME,
        mockUser: true
      })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.token) {
      throw new Error('No token received from authentication');
    }

    logSuccess(`تم تسجيل الدخول بنجاح للمستخدم: ${data.user.username}`);
    logSuccess(`User ID: ${data.user.id}`);
    logSuccess(`Role: ${data.user.role}`);
    
    return data.token;
  } catch (error) {
    logError(`فشل في المصادقة: ${error.message}`);
    throw error;
  }
}

/**
 * Step 2: Create GeoTIFF processing job
 */
async function createGeoJob(token, inputKey) {
  logStep(2, `إنشاء مهمة معالجة GeoTIFF للملف: ${inputKey}`);
  
  const jobPayload = {
    taskType: 'GEOTIFF_PROCESSING',
    targetType: 'neighborhoodUnit',
    targetId: NEIGHBORHOOD_UNIT_ID,
    inputKey: inputKey,
    inputPayload: {
      originalFilename: inputKey,
      size: 19485826, // تقديري
      contentType: 'image/tiff'
    },
    priority: 100
  };

  try {
    const response = await fetch(`${BASE_URL}/api/geo-jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create geo job: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const jobData = await response.json();
    
    if (!jobData.success || !jobData.data?.job?.id) {
      throw new Error('Invalid response from geo job creation');
    }

    const job = jobData.data.job;
    logSuccess(`تم إنشاء المهمة بنجاح - Job ID: ${job.id}`);
    logSuccess(`Status: ${job.status}`);
    logSuccess(`Created: ${job.createdAt}`);
    
    return job;
  } catch (error) {
    logError(`فشل في إنشاء مهمة المعالجة: ${error.message}`);
    throw error;
  }
}

/**
 * Step 3: Poll job status until completion
 */
async function pollJobStatus(token, jobId) {
  logStep(3, `مراقبة حالة المهمة: ${jobId}`);
  
  let attempts = 0;
  
  while (attempts < MAX_POLL_ATTEMPTS) {
    try {
      const response = await fetch(`${BASE_URL}/api/geo-jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch job status: ${response.status}`);
      }

      const jobData = await response.json();
      
      if (!jobData.success) {
        throw new Error('Invalid response from job status API');
      }

      const job = jobData.data.job;
      log(`Attempt ${attempts + 1}: Status = ${job.status}`);
      
      // Check for completion states
      if (job.status === 'completed') {
        logSuccess('المهمة اكتملت بنجاح!');
        return job;
      } else if (job.status === 'failed') {
        logError(`المهمة فشلت: ${job.errorMessage || 'Unknown error'}`);
        throw new Error(`Job failed: ${job.errorMessage || 'Unknown error'}`);
      } else if (['cancelled', 'timeout'].includes(job.status)) {
        logWarning(`المهمة توقفت: ${job.status}`);
        throw new Error(`Job stopped with status: ${job.status}`);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      attempts++;
      
    } catch (error) {
      logError(`خطأ في مراقبة المهمة: ${error.message}`);
      
      if (attempts >= MAX_POLL_ATTEMPTS - 1) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      attempts++;
    }
  }
  
  throw new Error(`Job polling timed out after ${MAX_POLL_ATTEMPTS} attempts`);
}

/**
 * Step 4: Verify overlay creation and get results
 */
async function verifyOverlay(token, targetId) {
  logStep(4, 'التحقق من إنشاء Overlay والحصول على النتائج');
  
  try {
    const response = await fetch(`${BASE_URL}/api/geo-jobs?targetId=${targetId}&targetType=neighborhoodUnit&includeOverlay=true`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch overlays: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Invalid response from overlays API');
    }

    const overlays = data.data.overlays || [];
    
    if (overlays.length === 0) {
      logWarning('لم يتم العثور على أي overlays');
      return null;
    }

    logSuccess(`تم العثور على ${overlays.length} overlay(s)`);
    
    overlays.forEach((overlay, index) => {
      log(`\nOverlay ${index + 1}:`);
      log(`  - ID: ${overlay.id}`);
      log(`  - Name: ${overlay.name}`);
      log(`  - Status: ${overlay.status}`);
      log(`  - PNG URL: ${overlay.pngUrl || 'N/A'}`);
      log(`  - Bounds: ${JSON.stringify(overlay.bounds)}`);
    });
    
    return overlays;
  } catch (error) {
    logError(`فشل في التحقق من Overlays: ${error.message}`);
    throw error;
  }
}

/**
 * Main execution function
 */
async function runPoC() {
  log(`${colors.bold}${colors.blue}==================================`);
  log(`🇾🇪 منصة بناء اليمن - GeoTIFF PoC Script`);
  log(`==================================`);
  log(`Target: وحدة الجوار 2A3`);
  log(`Base URL: ${BASE_URL}`);
  log(`==================================${colors.reset}\n`);

  try {
    // Step 1: Authenticate
    const token = await authenticate();
    
    // Step 2: Create processing job (using existing file key)
    const inputKey = '2A3.tif'; // ملف موجود مسبقاً
    const job = await createGeoJob(token, inputKey);
    
    // Step 3: Poll for completion
    const completedJob = await pollJobStatus(token, job.id);
    
    // Step 4: Verify results
    const overlays = await verifyOverlay(token, NEIGHBORHOOD_UNIT_ID);
    
    // Final results
    log(`\n${colors.bold}${colors.green}=== نتائج PoC ===`);
    logSuccess('جميع الخطوات اكتملت بنجاح!');
    logSuccess(`Job ID: ${completedJob.id}`);
    logSuccess(`Overlays Created: ${overlays ? overlays.length : 0}`);
    
    if (overlays && overlays.length > 0) {
      logSuccess('النظام يعمل بشكل صحيح - تم إنشاء Overlays بنجاح');
    } else {
      logWarning('النظام يعمل لكن لم يتم إنشاء Overlays');
    }
    
    log(`${colors.green}=================`);
    
  } catch (error) {
    log(`\n${colors.bold}${colors.red}=== PoC Failed ===`);
    logError(`Script failed: ${error.message}`);
    log(`${colors.red}==================`);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\nScript interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  logError(`Unhandled promise rejection: ${error.message}`);
  process.exit(1);
});

// Run the PoC
runPoC();