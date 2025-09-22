#!/usr/bin/env node

/**
 * Mock GeoTIFF Processing Worker
 * يحاكي معالجة ملفات GeoTIFF ويُحول المهام من queued إلى completed
 * 
 * الهدف: إظهار العملية الكاملة للنظام من البداية للنهاية
 */

import fetch from 'node-fetch';

// Configuration
const BASE_URL = 'http://localhost:5000';
const CHECK_INTERVAL = 3000; // 3 seconds
const PROCESSING_TIME = 8000; // 8 seconds simulation

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logWorker(message) {
  log(`${colors.bold}${colors.cyan}[🔨 WORKER]${colors.reset} ${message}`);
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

// Authentication helper
async function authenticate() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/simple-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin_test',
        mockUser: true
      })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    logError(`Authentication failed: ${error.message}`);
    throw error;
  }
}

// Claim next job from queue
async function claimNextJob(token) {
  try {
    const response = await fetch(`${BASE_URL}/api/internal/geo-jobs/claim`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workerId: 'mock-worker-nodejs'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to claim job: ${response.status}`);
    }

    const data = await response.json();
    return data.success && data.data?.job ? data.data.job : null;
  } catch (error) {
    logError(`Failed to claim job: ${error.message}`);
    return null;
  }
}

// Update job progress
async function updateJobProgress(token, jobId, progress, message) {
  try {
    const response = await fetch(`${BASE_URL}/api/internal/geo-jobs/${jobId}/progress`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        progress,
        message,
        workerId: 'mock-worker-nodejs'
      })
    });

    if (!response.ok) {
      throw new Error(`Progress update failed: ${response.status}`);
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    logError(`Failed to update progress for job ${jobId}: ${error.message}`);
    return false;
  }
}

// Complete job
async function completeJob(token, jobId, outputPayload, outputKeys) {
  try {
    const response = await fetch(`${BASE_URL}/api/internal/geo-jobs/${jobId}/complete`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        outputPayload,
        outputKeys
      })
    });

    if (!response.ok) {
      throw new Error(`Job completion failed: ${response.status}`);
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    logError(`Failed to complete job ${jobId}: ${error.message}`);
    return false;
  }
}

// Fail job
async function failJob(token, jobId, error) {
  try {
    const response = await fetch(`${BASE_URL}/api/internal/geo-jobs/${jobId}/fail`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: error
      })
    });

    if (!response.ok) {
      throw new Error(`Job failure update failed: ${response.status}`);
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    logError(`Failed to mark job ${jobId} as failed: ${error.message}`);
    return false;
  }
}

// Simulate GeoTIFF processing
async function processGeoTiffJob(token, job) {
  const jobId = job.id;
  const inputKey = job.inputKey;
  
  logWorker(`بدء معالجة المهمة: ${jobId}`);
  logWorker(`ملف الإدخال: ${inputKey}`);

  try {
    // Step 1: Update initial progress (job already claimed = running)
    logWorker(`بدء معالجة ملف GeoTIFF...`);
    const initialUpdate = await updateJobProgress(token, jobId, 10, 'بدء معالجة ملف GeoTIFF...');

    if (!initialUpdate) {
      throw new Error('Failed to update initial progress');
    }

    logSuccess(`المهمة ${jobId} الآن في حالة 'running'`);

    // Step 2: Simulate processing steps
    const steps = [
      { progress: 25, message: 'قراءة ملف GeoTIFF...' },
      { progress: 50, message: 'تحليل البيانات الجغرافية...' },
      { progress: 75, message: 'تحويل إلى PNG...' },
      { progress: 90, message: 'إنشاء ملف JSON للـ bounds...' }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, PROCESSING_TIME / 4));
      
      logWorker(`التقدم: ${step.progress}% - ${step.message}`);
      
      await updateJobProgress(token, jobId, step.progress, step.message);
    }

    // Step 3: Generate mock output
    const outputKeys = [
      `geo-jobs/${jobId}/output/${inputKey.replace('.tif', '.png')}`,
      `geo-jobs/${jobId}/output/${inputKey.replace('.tif', '_bounds.json')}`
    ];

    const outputPayload = {
      pngUrl: `https://storage.googleapis.com/${outputKeys[0]}`,
      bounds: {
        north: 15.7081,
        south: 15.7001,
        east: 44.2156,
        west: 44.2076
      },
      originalFilename: inputKey,
      processedAt: new Date().toISOString(),
      pixelSize: { width: 1024, height: 1024 },
      coordinateSystem: 'EPSG:4326'
    };

    // Step 4: Mark as completed
    logWorker(`إكمال المعالجة وتحديث النتائج...`);
    const completedUpdate = await completeJob(token, jobId, outputPayload, outputKeys);

    if (!completedUpdate) {
      throw new Error('Failed to complete job');
    }

    logSuccess(`🎉 المهمة ${jobId} اكتملت بنجاح!`);
    logSuccess(`PNG URL: ${outputPayload.pngUrl}`);
    logSuccess(`Bounds: ${JSON.stringify(outputPayload.bounds)}`);

    return true;

  } catch (error) {
    logError(`فشل في معالجة المهمة ${jobId}: ${error.message}`);
    
    // Mark as failed
    await failJob(token, jobId, error.message);

    return false;
  }
}

// Main worker loop
async function runWorker() {
  log(`${colors.bold}${colors.blue}==================================`);
  log(`🔨 Mock GeoTIFF Processing Worker`);
  log(`منصة بناء اليمن - معالج محاكاة`);
  log(`==================================`);
  log(`Base URL: ${BASE_URL}`);
  log(`Check Interval: ${CHECK_INTERVAL}ms`);
  log(`==================================${colors.reset}\n`);

  let token = null;
  let processedJobs = 0;

  while (true) {
    try {
      // Re-authenticate if needed
      if (!token) {
        logWorker('جاري المصادقة...');
        token = await authenticate();
        logSuccess('تم تسجيل الدخول بنجاح');
      }

      // Try to claim next job
      logWorker('محاولة استلام مهمة من الطابور...');
      const claimedJob = await claimNextJob(token);

      if (!claimedJob) {
        logWorker(`لا توجد مهام متاحة في الطابور (تم معالجة ${processedJobs} مهام)`);
      } else {
        logWorker(`تم استلام مهمة: ${claimedJob.id} (${claimedJob.taskType})`);
        logWorker(`ملف الإدخال: ${claimedJob.inputKey}`);

        // Process the claimed job
        const success = await processGeoTiffJob(token, claimedJob);
        
        if (success) {
          processedJobs++;
          logSuccess(`🎉 إجمالي المهام المُنجزة: ${processedJobs}`);
        }
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));

    } catch (error) {
      logError(`خطأ في Worker: ${error.message}`);
      
      // Reset token on auth errors
      if (error.message.includes('Authentication') || error.message.includes('401')) {
        token = null;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\n🛑 Worker توقف بواسطة المستخدم');
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  logError(`Unhandled promise rejection: ${error.message}`);
});

// Start the worker
runWorker().catch(error => {
  logError(`Worker failed to start: ${error.message}`);
  process.exit(1);
});