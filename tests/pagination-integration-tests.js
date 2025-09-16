/**
 * Integration Tests for Enhanced Pagination Endpoints
 * 
 * اختبارات تكامل للـ endpoints المحسنة مع دعم التصفح
 * يمكن تشغيله باستخدام Node.js لاختبار الواجهة الخلفية
 */

const axios = require('axios');

// إعدادات الاختبار - تصحيح للنظام الحالي
const BASE_URL = 'http://localhost:5000/api'; // تم تصحيح المنفذ
let authToken = '';
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// دالة مساعدة للتحقق من النتائج
function assert(condition, message) {
  if (condition) {
    testResults.passed++;
    console.log(`    ✅ ${message}`);
  } else {
    testResults.failed++;
    testResults.errors.push(message);
    console.log(`    ❌ ${message}`);
  }
}

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

// اختبار RBAC و LBAC للـ endpoints الجديدة
async function testSecurityFeatures() {
  console.log('\n🔒 اختبار ميزات الأمان (RBAC/LBAC)...');

  // اختبار endpoint محمي بدون token
  console.log('  - اختبار الوصول بدون token');
  const noAuthToken = authToken;
  authToken = ''; // إزالة token مؤقتة
  
  const noAuthResult = await makeRequest('GET', '/users/paginated');
  assert(noAuthResult.status === 401, 'Should return 401 for requests without auth token');
  assert(noAuthResult.error && noAuthResult.error.message, 'Should return error message for unauthorized access');
  
  authToken = noAuthToken; // إرجاع token

  // اختبار endpoint للمواطنين فقط
  console.log('  - اختبار endpoint المواطنين');
  const citizenResult = await makeRequest('GET', '/citizen-applications/paginated');
  assert(citizenResult.status === 403, 'Should return 403 for citizen endpoint accessed by admin');
  assert(citizenResult.error && citizenResult.error.message, 'Should return error message for forbidden access');
}

// اختبار endpoints المحسنة مع pagination
async function testPaginatedEndpoints() {
  console.log('\n📋 اختبار endpoints المحسنة مع pagination...');

  // اختبار Users Paginated
  console.log('  - اختبار GET /api/users/paginated');
  const usersResult = await makeRequest('GET', '/users/paginated', null, {
    page: 1,
    pageSize: 5,
    sortBy: 'fullName',
    sortOrder: 'asc'
  });
  
  if (usersResult.success) {
    assert(usersResult.status === 200, 'Status code should be 200 for users/paginated');
    assert(Array.isArray(usersResult.data.data), 'Response should contain data array');
    assert(typeof usersResult.data.meta === 'object', 'Response should contain meta object');
    assert(typeof usersResult.data.meta.page === 'number', 'Meta should contain page number');
    assert(typeof usersResult.data.meta.total === 'number', 'Meta should contain total count');
    console.log(`    📊 البيانات: ${usersResult.data.data?.length || 0} مستخدم`);
    console.log(`    📄 الصفحة: ${usersResult.data.meta?.page || 'N/A'}`);
    console.log(`    📈 المجموع: ${usersResult.data.meta?.total || 'N/A'}`);
  } else {
    assert(false, `Users paginated endpoint failed: ${usersResult.error?.message || 'Unknown error'}`);
  }

  // اختبار Applications Paginated
  console.log('  - اختبار GET /api/applications/paginated');
  const appsResult = await makeRequest('GET', '/applications/paginated', null, {
    page: 1,
    pageSize: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  if (appsResult.success) {
    assert(appsResult.status === 200, 'Status code should be 200 for applications/paginated');
    assert(Array.isArray(appsResult.data.data), 'Applications response should contain data array');
    assert(typeof appsResult.data.meta === 'object', 'Applications response should contain meta object');
    assert(typeof appsResult.data.meta.page === 'number', 'Applications meta should contain page number');
    assert(typeof appsResult.data.meta.total === 'number', 'Applications meta should contain total count');
    console.log(`    📊 البيانات: ${appsResult.data.data?.length || 0} طلب`);
    console.log(`    📄 الصفحة: ${appsResult.data.meta?.page || 'N/A'}`);
    console.log(`    📈 المجموع: ${appsResult.data.meta?.total || 'N/A'}`);
  } else {
    assert(false, `Applications paginated endpoint failed: ${appsResult.error?.message || 'Unknown error'}`);
  }

  // اختبار Tasks Paginated
  console.log('  - اختبار GET /api/tasks/paginated');
  const tasksResult = await makeRequest('GET', '/tasks/paginated', null, {
    page: 1,
    pageSize: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  if (tasksResult.success) {
    assert(tasksResult.status === 200, 'Status code should be 200 for tasks/paginated');
    assert(Array.isArray(tasksResult.data.data), 'Tasks response should contain data array');
    assert(typeof tasksResult.data.meta === 'object', 'Tasks response should contain meta object');
    assert(typeof tasksResult.data.meta.page === 'number', 'Tasks meta should contain page number');
    assert(typeof tasksResult.data.meta.total === 'number', 'Tasks meta should contain total count');
    console.log(`    📊 البيانات: ${tasksResult.data.data?.length || 0} مهمة`);
    console.log(`    📄 الصفحة: ${tasksResult.data.meta?.page || 'N/A'}`);
    console.log(`    📈 المجموع: ${tasksResult.data.meta?.total || 'N/A'}`);
  } else {
    assert(false, `Tasks paginated endpoint failed: ${tasksResult.error?.message || 'Unknown error'}`);
  }
}

// اختبار معاملات التصفح المتقدمة
async function testAdvancedPagination() {
  console.log('\n🔄 اختبار ميزات التصفح المتقدمة...');

  // اختبار البحث
  console.log('  - اختبار البحث');
  const searchResult = await makeRequest('GET', '/users/paginated', null, {
    page: 1,
    pageSize: 5,
    search: 'admin'
  });
  
  if (searchResult.success) {
    assert(searchResult.status === 200, 'Search should return 200 status');
    assert(Array.isArray(searchResult.data.data), 'Search response should contain data array');
    assert(typeof searchResult.data.meta === 'object', 'Search response should contain meta object');
    console.log(`    🔍 نتائج البحث: ${searchResult.data.data?.length || 0} مستخدم`);
  } else {
    assert(false, `Search failed: ${searchResult.error?.message || 'Unknown error'}`);
  }

  // اختبار التصفية
  console.log('  - اختبار التصفية');
  const filterResult = await makeRequest('GET', '/users/paginated', null, {
    page: 1,
    pageSize: 5,
    'filters[role]': 'admin',
    'filters[isActive]': 'true'
  });
  
  if (filterResult.success) {
    console.log('    ✅ تم التصفية بنجاح');
    console.log(`    📋 نتائج التصفية: ${filterResult.data.data?.length || 0} مستخدم`);
  } else {
    console.log('    ❌ فشل في التصفية:', filterResult.error);
  }

  // اختبار الترتيب
  console.log('  - اختبار الترتيب');
  const sortResult = await makeRequest('GET', '/users/paginated', null, {
    page: 1,
    pageSize: 3,
    sortBy: 'createdAt',
    sortOrder: 'asc'
  });
  
  if (sortResult.success) {
    console.log('    ✅ تم الترتيب بنجاح');
    console.log(`    📊 ترتيب: ${sortResult.data.meta?.sort?.field || 'N/A'} ${sortResult.data.meta?.sort?.order || ''}`);
  } else {
    console.log('    ❌ فشل في الترتيب:', sortResult.error);
  }
}

// اختبار معالجة الأخطاء
async function testErrorHandling() {
  console.log('\n⚠️ اختبار معالجة الأخطاء...');

  // اختبار معاملات خاطئة
  console.log('  - اختبار معاملات pagination خاطئة');
  const invalidParamsResult = await makeRequest('GET', '/users/paginated', null, {
    page: -1,
    pageSize: 1000, // أكبر من الحد الأقصى
    sortBy: 'invalidField'
  });
  
  assert(invalidParamsResult.status === 400, 'Should return 400 for invalid pagination parameters');
  assert(invalidParamsResult.error && invalidParamsResult.error.message, 'Should return error message for invalid parameters');

  // اختبار endpoint غير موجود
  console.log('  - اختبار endpoint غير موجود');
  const notFoundResult = await makeRequest('GET', '/nonexistent/paginated');
  
  if (notFoundResult.status === 404) {
    console.log('    ✅ تم إرجاع 404 للـ endpoint غير الموجود');
  } else {
    console.log('    ❌ لم يتم إرجاع 404 للـ endpoint غير الموجود');
  }
}

// اختبار performance مع البيانات الكبيرة
async function testPerformance() {
  console.log('\n⚡ اختبار الأداء...');

  console.log('  - قياس زمن الاستجابة للصفحات الكبيرة');
  const startTime = Date.now();
  
  const perfResult = await makeRequest('GET', '/users/paginated', null, {
    page: 1,
    pageSize: 50 // صفحة كبيرة
  });
  
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  if (perfResult.success) {
    console.log(`    ✅ تم جلب 50 مستخدم في ${responseTime}ms`);
    if (responseTime < 1000) {
      console.log('    🚀 الأداء ممتاز (< 1 ثانية)');
    } else if (responseTime < 3000) {
      console.log('    👍 الأداء جيد (< 3 ثواني)');
    } else {
      console.log('    ⚠️ الأداء بطيء (> 3 ثواني)');
    }
  } else {
    console.log('    ❌ فشل في اختبار الأداء:', perfResult.error);
  }
}

// الدالة الرئيسية لتشغيل جميع الاختبارات
async function runAllTests() {
  console.log('🚀 بدء اختبارات تكامل pagination endpoints');
  console.log('=' .repeat(60));

  // تسجيل الدخول أولاً
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ لا يمكن المتابعة بدون تسجيل دخول صحيح');
    process.exit(1);
  }

  // تشغيل جميع الاختبارات
  await testSecurityFeatures();
  await testPaginatedEndpoints();
  await testAdvancedPagination();
  await testErrorHandling();
  await testPerformance();

  // طباعة النتائج النهائية
  console.log('\n' + '=' .repeat(60));
  console.log('📊 ملخص نتائج الاختبارات:');
  console.log(`✅ اختبارات نجحت: ${testResults.passed}`);
  console.log(`❌ اختبارات فشلت: ${testResults.failed}`);
  
  if (testResults.failed > 0) {
    console.log('\n💥 الاختبارات الفاشلة:');
    testResults.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
    console.log('\n❌ فشلت اختبارات التكامل');
    process.exit(1);
  } else {
    console.log('\n🎉 جميع اختبارات التكامل نجحت!');
    process.exit(0);
  }
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
  testSecurityFeatures,
  testPaginatedEndpoints,
  testAdvancedPagination,
  testErrorHandling,
  testPerformance
};