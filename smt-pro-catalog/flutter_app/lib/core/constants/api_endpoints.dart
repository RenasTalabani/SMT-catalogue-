/// Connection mode — change this ONE line to switch environments.
///
/// Mode.localWifi     → Same WiFi as your PC (replace IP below)
/// Mode.ngrok         → ngrok tunnel (replace URL below) — works from any network
/// Mode.production    → Deployed cloud backend
enum _Mode { localWifi, ngrok, production }

const _mode = _Mode.production; // ← production build

class ApiEndpoints {
  static String get baseUrl {
    switch (_mode) {
      case _Mode.localWifi:
        return 'http://192.168.1.73:3000';

      case _Mode.ngrok:
        // localtunnel — works from any network, no firewall needed
        return 'https://early-foxes-pull.loca.lt';

      case _Mode.production:
        // Your deployed backend URL on Railway / Render / VPS
        return 'https://api.daraliraq.com'; // ← set after domain is live
    }
  }

  // Auth
  static const String register = '/api/auth/register';
  static const String login    = '/api/auth/login';

  // Categories
  static const String categories = '/api/categories';

  // Products
  static const String products = '/api/products';

  // Orders
  static const String orders   = '/api/orders';
  static const String myOrders = '/api/orders/my';

  // Inventory
  static const String inventoryValue     = '/api/inventory/value';
  static const String stockMovements     = '/api/inventory/movements';
  static const String suppliers          = '/api/inventory/suppliers';

  // Finance
  static const String profitLoss = '/api/finance/profit-loss';
  static const String expenses   = '/api/finance/expenses';
  static const String incomes    = '/api/finance/incomes';

  // Reports
  static const String dashboard         = '/api/reports/dashboard';
  static const String salesAnalytics    = '/api/reports/sales';
  static const String topProducts       = '/api/reports/top-products';
  static const String categoryBreakdown = '/api/reports/category-breakdown';
  static const String auditLogs         = '/api/reports/audit';

  // Health check
  static const String health = '/health';
}
