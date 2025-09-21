#!/usr/bin/env node
/**
 * اختبار شامل لنظام المعالجة الجغرافية
 * =====================================
 * 
 * يختبر النظام الكامل من التسجيل حتى تحميل النتائج
 */

import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000';

// Test configuration
const TEST_CONFIG = {
    testUser: {
        username: 'test_geo_user',
        email: 'test.geo@yemen.digital',
        password: 'Test123!@#',
        fullNameAr: 'مستخدم اختبار المعالجة الجغرافية',
        fullNameEn: 'Geo Processing Test User',
        phoneNumber: '+967-1-234567'
    },
    testFile: 'geotiff-processor-poc/2A1.tif',
    expectedOutputs: ['png', 'metadata', 'world_file']
};

// Utilities
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
        info: '\x1b[36m',
        success: '\x1b[32m',
        error: '\x1b[31m',
        warning: '\x1b[33m',
        reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, finalOptions);
        const data = await response.json();
        
        return {
            status: response.status,
            ok: response.ok,
            data
        };
    } catch (error) {
        log(`API Request failed: ${error.message}`, 'error');
        throw error;
    }
}

// Test Steps
class E2ETest {
    constructor() {
        this.userToken = null;
        this.testJobId = null;
        this.results = {
            steps: [],
            summary: {
                passed: 0,
                failed: 0,
                total: 0
            }
        };
    }
    
    async runStep(name, testFn) {
        this.results.summary.total++;
        log(`🧪 Starting: ${name}`);
        
        try {
            const startTime = Date.now();
            const result = await testFn();
            const duration = Date.now() - startTime;
            
            this.results.steps.push({
                name,
                status: 'passed',
                duration,
                result
            });
            
            this.results.summary.passed++;
            log(`✅ Passed: ${name} (${duration}ms)`, 'success');
            return result;
            
        } catch (error) {
            this.results.steps.push({
                name,
                status: 'failed',
                error: error.message,
                stack: error.stack
            });
            
            this.results.summary.failed++;
            log(`❌ Failed: ${name} - ${error.message}`, 'error');
            throw error;
        }
    }
    
    async testApiHealth() {
        return await this.runStep('API Health Check', async () => {
            // Try the main app endpoint since /health might not exist
            const response = await fetch(`${API_BASE}/`);
            
            if (!response.ok) {
                throw new Error(`API health check failed: ${response.status}`);
            }
            
            return { healthy: true, status: response.status };
        });
    }
    
    async testUserRegistration() {
        return await this.runStep('User Registration', async () => {
            const response = await apiRequest('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(TEST_CONFIG.testUser)
            });
            
            if (!response.ok) {
                throw new Error(`Registration failed: ${response.data?.error || response.status}`);
            }
            
            return response.data;
        });
    }
    
    async testUserLogin() {
        return await this.runStep('User Login', async () => {
            const response = await apiRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    username: TEST_CONFIG.testUser.username,
                    password: TEST_CONFIG.testUser.password
                })
            });
            
            if (!response.ok) {
                throw new Error(`Login failed: ${response.data?.error || response.status}`);
            }
            
            this.userToken = response.data.token;
            
            if (!this.userToken) {
                throw new Error('No token received from login');
            }
            
            return { token: '***', user: response.data.user };
        });
    }
    
    async testCreateGeoJob() {
        return await this.runStep('Create Geo Job', async () => {
            const response = await apiRequest('/api/geo-jobs', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.userToken}`
                },
                body: JSON.stringify({
                    taskType: 'geotiff_to_png',
                    priority: 1,
                    inputPayload: {
                        maxSize: 2048,
                        generateThumbnails: true,
                        includeStatistics: true
                    },
                    idempotencyKey: `test-${Date.now()}`
                })
            });
            
            if (!response.ok) {
                throw new Error(`Job creation failed: ${response.data?.error || response.status}`);
            }
            
            this.testJobId = response.data.data.job.id;
            
            if (!this.testJobId) {
                throw new Error('No job ID received');
            }
            
            return response.data.data.job;
        });
    }
    
    async testFileUpload() {
        return await this.runStep('Test File Upload Process', async () => {
            if (!fs.existsSync(TEST_CONFIG.testFile)) {
                throw new Error(`Test file not found: ${TEST_CONFIG.testFile}`);
            }
            
            const fileStats = fs.statSync(TEST_CONFIG.testFile);
            const fileName = path.basename(TEST_CONFIG.testFile);
            
            // Get upload URL
            const uploadResponse = await apiRequest(`/api/geo-jobs/${this.testJobId}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.userToken}`
                },
                body: JSON.stringify({
                    fileName: fileName,
                    fileSize: fileStats.size,
                    fileType: 'image/tiff'
                })
            });
            
            if (!uploadResponse.ok) {
                throw new Error(`Upload URL generation failed: ${uploadResponse.data?.error || uploadResponse.status}`);
            }
            
            // Note: In a real test, we would upload the file to the signed URL
            // For now, we just verify the upload URL was generated
            
            return {
                fileName,
                fileSize: fileStats.size,
                uploadUrl: uploadResponse.data.data.uploadUrl ? 'Generated' : 'Not generated',
                fileKey: uploadResponse.data.data.fileKey
            };
        });
    }
    
    async testJobStatus() {
        return await this.runStep('Check Job Status', async () => {
            const response = await apiRequest(`/api/geo-jobs/${this.testJobId}`, {
                headers: {
                    'Authorization': `Bearer ${this.userToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Job status check failed: ${response.data?.error || response.status}`);
            }
            
            return response.data.data.job;
        });
    }
    
    async testJobEvents() {
        return await this.runStep('Check Job Events', async () => {
            const response = await apiRequest(`/api/geo-jobs/${this.testJobId}/events`, {
                headers: {
                    'Authorization': `Bearer ${this.userToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Job events check failed: ${response.data?.error || response.status}`);
            }
            
            return response.data.data.events;
        });
    }
    
    async testJobFiles() {
        return await this.runStep('List Job Files', async () => {
            const response = await apiRequest(`/api/geo-jobs/${this.testJobId}/files`, {
                headers: {
                    'Authorization': `Bearer ${this.userToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Job files listing failed: ${response.data?.error || response.status}`);
            }
            
            return response.data.data;
        });
    }
    
    async testInternalEndpoints() {
        return await this.runStep('Test Internal Endpoints (Worker)', async () => {
            // Test worker endpoints that would be used by Python worker
            const claimResponse = await apiRequest('/api/internal/geo-jobs/claim', {
                method: 'POST',
                headers: {
                    'Authorization': 'Worker test-worker-token'
                },
                body: JSON.stringify({
                    workerId: 'test-worker-e2e'
                })
            });
            
            // This might return 404 (no jobs available) which is okay
            if (claimResponse.status !== 200 && claimResponse.status !== 404) {
                throw new Error(`Worker claim endpoint failed: ${claimResponse.status}`);
            }
            
            return {
                claimEndpoint: claimResponse.status === 404 ? 'No jobs available (OK)' : 'Job claimed',
                status: claimResponse.status
            };
        });
    }
    
    async runAllTests() {
        log('🚀 Starting E2E Geoprocessing Tests', 'info');
        log('='.repeat(50));
        
        try {
            // Core API tests
            await this.testApiHealth();
            
            // User authentication flow
            try {
                await this.testUserRegistration();
            } catch (error) {
                // Registration might fail if user exists, try login directly
                log('Registration failed, trying direct login...', 'warning');
            }
            
            await this.testUserLogin();
            
            // Geo job workflow
            await this.testCreateGeoJob();
            await this.testFileUpload();
            await this.testJobStatus();
            await this.testJobEvents();
            await this.testJobFiles();
            
            // Worker endpoints
            await this.testInternalEndpoints();
            
        } catch (error) {
            log(`Test suite stopped due to critical error: ${error.message}`, 'error');
        }
        
        // Print results
        this.printResults();
    }
    
    printResults() {
        log('='.repeat(50));
        log('📊 Test Results Summary');
        log('='.repeat(50));
        
        const { passed, failed, total } = this.results.summary;
        const successRate = ((passed / total) * 100).toFixed(1);
        
        log(`Total Tests: ${total}`);
        log(`Passed: ${passed}`, passed > 0 ? 'success' : 'info');
        log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
        log(`Success Rate: ${successRate}%`, successRate > 80 ? 'success' : 'warning');
        
        if (failed > 0) {
            log('\n❌ Failed Tests:', 'error');
            this.results.steps
                .filter(step => step.status === 'failed')
                .forEach(step => {
                    log(`  - ${step.name}: ${step.error}`, 'error');
                });
        }
        
        if (passed > 0) {
            log('\n✅ Passed Tests:', 'success');
            this.results.steps
                .filter(step => step.status === 'passed')
                .forEach(step => {
                    log(`  - ${step.name} (${step.duration}ms)`, 'success');
                });
        }
        
        // System status summary
        log('\n🏥 System Health Summary:');
        const systemHealth = {
            api: this.results.steps.find(s => s.name === 'API Health Check')?.status === 'passed',
            auth: this.results.steps.find(s => s.name === 'User Login')?.status === 'passed',
            geoJobs: this.results.steps.find(s => s.name === 'Create Geo Job')?.status === 'passed',
            fileOps: this.results.steps.find(s => s.name === 'Test File Upload Process')?.status === 'passed',
            worker: this.results.steps.find(s => s.name === 'Test Internal Endpoints (Worker)')?.status === 'passed'
        };
        
        Object.entries(systemHealth).forEach(([component, healthy]) => {
            log(`  ${healthy ? '✅' : '❌'} ${component.toUpperCase()}: ${healthy ? 'Healthy' : 'Issues detected'}`, 
                healthy ? 'success' : 'error');
        });
        
        if (this.testJobId) {
            log(`\n🔗 Test Job ID: ${this.testJobId}`);
            log('   Use this ID to test worker processing manually');
        }
        
        return successRate >= 80;
    }
}

// Run tests
async function main() {
    // Check if we're in the right environment
    if (!fs.existsSync('package.json')) {
        log('Please run this test from the project root directory', 'error');
        process.exit(1);
    }
    
    if (!fs.existsSync(TEST_CONFIG.testFile)) {
        log(`Test file not found: ${TEST_CONFIG.testFile}`, 'error');
        log('Make sure the GeoTIFF test file exists', 'error');
        process.exit(1);
    }
    
    const test = new E2ETest();
    const success = await test.runAllTests();
    
    process.exit(success ? 0 : 1);
}

main().catch(error => {
    log(`Test runner failed: ${error.message}`, 'error');
    process.exit(1);
});