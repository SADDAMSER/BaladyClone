class AuthService {
  static bool _isLoggedIn = false;
  static String? _currentUser;

  static Future<bool> login(String username, String password) async {
    // Simulate network delay
    await Future.delayed(const Duration(seconds: 1));
    
    // Test accounts for demo
    final testAccounts = {
      'ahmed': '1234',
      'احمد': '1234',
      'surveyor1': '1234',
      'مساح1': '1234',
      'admin': '1234',
    };
    
    if (testAccounts.containsKey(username) && 
        testAccounts[username] == password) {
      _isLoggedIn = true;
      _currentUser = username;
      return true;
    }
    
    return false;
  }

  static Future<void> logout() async {
    _isLoggedIn = false;
    _currentUser = null;
  }

  static bool get isLoggedIn => _isLoggedIn;
  static String? get currentUser => _currentUser;
}