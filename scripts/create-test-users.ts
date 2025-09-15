import { storage } from '../server/storage';
import bcrypt from 'bcrypt';
import type { User } from '../shared/schema';

const testUsers = [
  {
    username: 'admin_test',
    email: 'admin@test.yemen.gov.ye',
    fullName: 'أحمد محمد المدير العام',
    password: 'Admin123!',
    role: 'admin', // Legacy compatibility
    roleCodes: ['admin'], // New RBAC system
    departmentId: null,
    positionId: null,
    isActive: true
  },
  {
    username: 'engineer_test',
    email: 'engineer@test.yemen.gov.ye',
    fullName: 'فاطمة علي المهندسة',
    password: 'Engineer123!',
    role: 'engineer', // Legacy compatibility
    roleCodes: ['engineer'], // New RBAC system  
    departmentId: null,
    positionId: null,
    isActive: true
  },
  {
    username: 'manager_test',
    email: 'manager@test.yemen.gov.ye',
    fullName: 'خالد سالم المدير',
    password: 'Manager123!',
    role: 'manager', // Legacy compatibility
    roleCodes: ['manager'], // New RBAC system
    departmentId: null,
    positionId: null,
    isActive: true
  }
];

async function createTestUsers() {
  try {
    console.log('👥 Creating test users for RBAC system testing...');
    
    // Get available roles from database
    const availableRoles = await storage.getRoles();
    const roleMap = new Map(availableRoles.map(role => [role.code, role]));
    
    console.log('📋 Available roles:', availableRoles.map(r => r.code).join(', '));
    
    const createdUsers: User[] = [];
    
    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        console.log(`⚠️  User ${userData.username} already exists. Skipping creation.`);
        
        // Ensure user has proper role assignments in new RBAC system
        try {
          const userRoles = await storage.getUserActiveRoles(existingUser.id);
          const userRoleCodes = userRoles.map(r => r.code);
          
          for (const roleCode of userData.roleCodes) {
            if (!userRoleCodes.includes(roleCode)) {
              const role = roleMap.get(roleCode);
              if (role) {
                await storage.assignRoleToUser({ userId: existingUser.id, roleId: role.id });
                console.log(`🔗 Assigned role ${roleCode} to existing user ${userData.username}`);
              }
            }
          }
        } catch (roleError) {
          console.error(`❌ Error updating roles for ${userData.username}:`, roleError);
        }
        
        createdUsers.push(existingUser);
        continue;
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Create user
      const newUser = await storage.createUser({
        username: userData.username,
        email: userData.email,
        fullName: userData.fullName,
        password: hashedPassword,
        role: userData.role, // Legacy field
        departmentId: userData.departmentId,
        positionId: userData.positionId,
        isActive: userData.isActive
      });
      
      console.log(`✅ Created user: ${newUser.username} (${newUser.fullName})`);
      
      // Assign roles in new RBAC system
      for (const roleCode of userData.roleCodes) {
        const role = roleMap.get(roleCode);
        if (role) {
          try {
            await storage.assignRoleToUser({ userId: newUser.id, roleId: role.id });
            console.log(`🔗 Assigned role ${roleCode} to user ${newUser.username}`);
          } catch (assignError) {
            console.error(`❌ Failed to assign role ${roleCode} to ${newUser.username}:`, assignError);
          }
        } else {
          console.error(`❌ Role ${roleCode} not found in database`);
        }
      }
      
      createdUsers.push(newUser);
    }
    
    console.log('✨ Test user creation completed successfully!');
    console.log(`Created/verified ${createdUsers.length} test users:`);
    
    // Display summary
    for (const user of createdUsers) {
      try {
        const userRoles = await storage.getUserActiveRoles(user.id);
        const roleCodes = userRoles.map(r => r.code).join(', ');
        console.log(`👤 ${user.username}: ${user.fullName} (Roles: ${roleCodes})`);
      } catch (error) {
        console.log(`👤 ${user.username}: ${user.fullName} (Legacy role: ${user.role})`);
      }
    }
    
    console.log('\n🔐 Test credentials:');
    for (const userData of testUsers) {
      console.log(`${userData.username} / ${userData.password}`);
    }
    
  } catch (error) {
    console.error('❌ Error during test user creation:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTestUsers();
}

export { createTestUsers };