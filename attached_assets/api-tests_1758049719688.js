/**
 * API Tests for Enhanced Endpoints with Pagination
 * 
 * هذا الملف يحتوي على اختبارات بسيطة لـ endpoints الجديدة
 * يمكن تشغيله باستخدام Node.js لاختبار الواجهة الخلفية
 */

const axios = require('axios');

// إعدادات الاختبار
const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

// دالة مساعدة لإجراء طلبات HTTP
async function makeRequest(method, endpoint, data = null, params = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      params,
      ...(data && { data })
    };

    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      error: error.response?.data || error.message
    };
  }
}

// دالة تسجيل الدخول للحصول على token
async function login() {
  console.log('🔐 تسجيل الدخول...');
  
  const result = await makeRequest('POST', '/auth/simple-login', {
    username: 'admin_test',
    password: 'demo123',
    mockUser: true
  });

  if (result.success && result.data.token) {
    authToken = result.data.token;
    console.log('✅ تم تسجيل الدخول بنجاح');
    return true;
  } else {
    console.error('❌ فشل في تسجيل الدخول:', result.error);
    return false;
  }
}

// اختبار endpoints المهام
async function testTasksEndpoints() {
  console.log('\n📋 اختبار endpoints المهام...');

  // اختبار جلب المهام مع تصفح
  console.log('  - اختبار GET /api/tasks');
  const tasksResult = await makeRequest('GET', '/tasks', null, {
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  if (tasksResult.success) {
    console.log('    ✅ تم جلب المهام بنجاح');
    console.log(`    📊 عدد المهام: ${tasksResult.data.data?.pagination?.total || 0}`);
  } else {
    console.log('    ❌ فشل في جلب المهام:', tasksResult.error);
  }

  // اختبار إحصائيات المهام
  console.log('  - اختبار GET /api/tasks/stats');
  const statsResult = await makeRequest('GET', '/tasks/stats');
  
  if (statsResult.success) {
    console.log('    ✅ تم جلب إحصائيات المهام بنجاح');
    console.log(`    📈 إجمالي المهام: ${statsResult.data.data?.total || 0}`);
  } else {
    console.log('    ❌ فشل في جلب إحصائيات المهام:', statsResult.error);
  }

  // اختبار إنشاء مهمة جديدة
  console.log('  - اختبار POST /api/tasks');
  const newTaskResult = await makeRequest('POST', '/tasks', {
    title: 'مهمة اختبار',
    description: 'هذه مهمة اختبار تم إنشاؤها من خلال API',
    priority: 'medium',
    status: 'pending',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // أسبوع من الآن
  });
  
  if (newTaskResult.success) {
    console.log('    ✅ تم إنشاء المهمة بنجاح');
    console.log(`    🆔 معرف المهمة: ${newTaskResult.data.data?.id}`);
    
    // اختبار تحديث حالة المهمة
    if (newTaskResult.data.data?.id) {
      console.log('  - اختبار PUT /api/tasks/:id/status');
      const updateStatusResult = await makeRequest('PUT', `/tasks/${newTaskResult.data.data.id}/status`, {
        status: 'in_progress',
        notes: 'تم بدء العمل على المهمة'
      });
      
      if (updateStatusResult.success) {
        console.log('    ✅ تم تحديث حالة المهمة بنجاح');
      } else {
        console.log('    ❌ فشل في تحديث حالة المهمة:', updateStatusResult.error);
      }
    }
  } else {
    console.log('    ❌ فشل في إنشاء المهمة:', newTaskResult.error);
  }
}

// اختبار endpoints الطلبات المحسنة
async function testApplicationsEndpoints() {
  console.log('\n📄 اختبار endpoints الطلبات المحسنة...');

  // اختبار جلب الطلبات مع تصفح
  console.log('  - اختبار GET /api/applications/paginated');
  const appsResult = await makeRequest('GET', '/applications/paginated', null, {
    page: 1,
    limit: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  if (appsResult.success) {
    console.log('    ✅ تم جلب الطلبات بنجاح');
    console.log(`    📊 عدد الطلبات: ${appsResult.data.data?.pagination?.total || 0}`);
  } else {
    console.log('    ❌ فشل في جلب الطلبات:', appsResult.error);
  }

  // اختبار إحصائيات الطلبات
  console.log('  - اختبار GET /api/applications/stats');
  const appStatsResult = await makeRequest('GET', '/applications/stats');
  
  if (appStatsResult.success) {
    console.log('    ✅ تم جلب إحصائيات الطلبات بنجاح');
    console.log(`    📈 إجمالي الطلبات: ${appStatsResult.data.data?.total || 0}`);
  } else {
    console.log('    ❌ فشل في جلب إحصائيات الطلبات:', appStatsResult.error);
  }
}

// اختبار endpoints المستخدمين المحسنة
async function testUsersEndpoints() {
  console.log('\n👥 اختبار endpoints المستخدمين المحسنة...');

  // اختبار جلب المستخدمين مع تصفح
  console.log('  - اختبار GET /api/users/paginated');
  const usersResult = await makeRequest('GET', '/users/paginated', null, {
    page: 1,
    limit: 10,
    sortBy: 'fullName',
    sortOrder: 'asc'
  });
  
  if (usersResult.success) {
    console.log('    ✅ تم جلب المستخدمين بنجاح');
    console.log(`    📊 عدد المستخدمين: ${usersResult.data.data?.pagination?.total || 0}`);
  } else {
    console.log('    ❌ فشل في جلب المستخدمين:', usersResult.error);
  }

  // اختبار البحث في المستخدمين
  console.log('  - اختبار GET /api/users/search');
  const searchResult = await makeRequest('GET', '/users/search', null, {
    q: 'admin',
    limit: 5
  });
  
  if (searchResult.success) {
    console.log('    ✅ تم البحث في المستخدمين بنجاح');
    console.log(`    🔍 عدد النتائج: ${searchResult.data.data?.length || 0}`);
  } else {
    console.log('    ❌ فشل في البحث في المستخدمين:', searchResult.error);
  }
}

// اختبار إحصائيات لوحة التحكم
async function testDashboardStats() {
  console.log('\n📊 اختبار إحصائيات لوحة التحكم...');

  console.log('  - اختبار GET /api/dashboard/stats');
  const dashboardResult = await makeRequest('GET', '/dashboard/stats');
  
  if (dashboardResult.success) {
    console.log('    ✅ تم جلب إحصائيات لوحة التحكم بنجاح');
    const stats = dashboardResult.data.data;
    console.log(`    📈 الطلبات: ${stats?.applications?.total || 0}`);
    console.log(`    📋 المهام: ${stats?.tasks?.total || 0}`);
    console.log(`    👥 المستخدمين: ${stats?.users?.total || 0}`);
    console.log(`    🏢 الأقسام: ${stats?.departments?.total || 0}`);
  } else {
    console.log('    ❌ فشل في جلب إحصائيات لوحة التحكم:', dashboardResult.error);
  }
}

// اختبار معاملات التصفح المختلفة
async function testPaginationFeatures() {
  console.log('\n🔄 اختبار ميزات التصفح المتقدمة...');

  // اختبار البحث والتصفية
  console.log('  - اختبار البحث والتصفية في المهام');
  const searchTasksResult = await makeRequest('GET', '/tasks', null, {
    page: 1,
    limit: 5,
    search: 'مسح',
    'filters[status]': 'pending',
    'filters[priority]': 'high',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  if (searchTasksResult.success) {
    console.log('    ✅ تم البحث والتصفية بنجاح');
    console.log(`    🔍 عدد النتائج: ${searchTasksResult.data.data?.pagination?.total || 0}`);
  } else {
    console.log('    ❌ فشل في البحث والتصفية:', searchTasksResult.error);
  }

  // اختبار صفحات متعددة
  console.log('  - اختبار التنقل بين الصفحات');
  const page2Result = await makeRequest('GET', '/tasks', null, {
    page: 2,
    limit: 3,
    sortBy: 'createdAt'
  });
  
  if (page2Result.success) {
    console.log('    ✅ تم جلب الصفحة الثانية بنجاح');
    const pagination = page2Result.data.data?.pagination;
    console.log(`    📄 الصفحة: ${pagination?.page || 0}/${pagination?.totalPages || 0}`);
    console.log(`    ⬅️ يوجد صفحة سابقة: ${pagination?.hasPrev ? 'نعم' : 'لا'}`);
    console.log(`    ➡️ يوجد صفحة تالية: ${pagination?.hasNext ? 'نعم' : 'لا'}`);
  } else {
    console.log('    ❌ فشل في جلب الصفحة الثانية:', page2Result.error);
  }
}

// الدالة الرئيسية لتشغيل جميع الاختبارات
async function runAllTests() {
  console.log('🚀 بدء اختبار API endpoints الجديدة مع دعم التصفح');
  console.log('=' .repeat(60));

  // تسجيل الدخول أولاً
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ لا يمكن المتابعة بدون تسجيل دخول صحيح');
    return;
  }

  // تشغيل جميع الاختبارات
  await testTasksEndpoints();
  await testApplicationsEndpoints();
  await testUsersEndpoints();
  await testDashboardStats();
  await testPaginationFeatures();

  console.log('\n' + '=' .repeat(60));
  console.log('✅ انتهت جميع الاختبارات');
}

// تشغيل الاختبارات إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ خطأ في تشغيل الاختبارات:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testTasksEndpoints,
  testApplicationsEndpoints,
  testUsersEndpoints,
  testDashboardStats,
  testPaginationFeatures
};

