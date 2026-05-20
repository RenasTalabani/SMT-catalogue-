import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_riverpod.dart';
import '../../../core/constants/api_endpoints.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _formKey   = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl  = TextEditingController();
  bool _obscure    = true;
  late AnimationController _animCtrl;
  late Animation<double>   _fadeAnim;
  late Animation<Offset>   _slideAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _fadeAnim  = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(begin: const Offset(0, 0.12), end: Offset.zero)
        .animate(CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut));
    _animCtrl.forward();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(authProvider.notifier).pingServer();
    });
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await ref.read(authProvider.notifier).login(
      _emailCtrl.text.trim(),
      _passCtrl.text,
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0F172A), Color(0xFF1E3A8A), Color(0xFF1D4ED8)],
            stops: [0.0, 0.55, 1.0],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: FadeTransition(
                opacity: _fadeAnim,
                child: SlideTransition(
                  position: _slideAnim,
                  child: Column(
                    children: [
                      _buildHeader(),
                      const SizedBox(height: 36),
                      _buildCard(auth),
                      const SizedBox(height: 24),
                      _buildFooter(),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() => Column(children: [
    Container(
      width: 80, height: 80,
      decoration: BoxDecoration(
        color: Colors.white.withAlpha(38),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withAlpha(76), width: 1.5),
      ),
      child: const Icon(Icons.inventory_2_rounded, size: 44, color: Colors.white),
    ),
    const SizedBox(height: 20),
    const Text('DaralIraq',
        style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: -0.5)),
    const SizedBox(height: 6),
    Text('Enterprise Inventory & Sales Platform',
        style: TextStyle(fontSize: 13, color: Colors.white.withAlpha(165))),
  ]);

  Widget _buildCard(AuthState auth) => Container(
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(24),
      boxShadow: [BoxShadow(color: Colors.black.withAlpha(64), blurRadius: 40, offset: const Offset(0, 16))],
    ),
    padding: const EdgeInsets.all(28),
    child: Form(
      key: _formKey,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        _ServerStatus(auth: auth, onRetry: () => ref.read(authProvider.notifier).pingServer()),
        const SizedBox(height: 20),
        const Text('Sign in to your account',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
        const SizedBox(height: 4),
        const Text('Enter your credentials to continue',
            style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
        const SizedBox(height: 24),
        const Text('Email address', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
        const SizedBox(height: 6),
        TextFormField(
          controller: _emailCtrl,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(hintText: 'you@company.com', prefixIcon: Icon(Icons.email_outlined, size: 20)),
          validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
        ),
        const SizedBox(height: 16),
        const Text('Password', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
        const SizedBox(height: 6),
        TextFormField(
          controller: _passCtrl,
          obscureText: _obscure,
          onFieldSubmitted: (_) => _submit(),
          decoration: InputDecoration(
            hintText: '••••••••',
            prefixIcon: const Icon(Icons.lock_outline, size: 20),
            suffixIcon: IconButton(
              icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20),
              onPressed: () => setState(() => _obscure = !_obscure),
            ),
          ),
          validator: (v) => (v == null || v.length < 6) ? 'Min 6 characters' : null,
        ),
        if (auth.error != null) ...[
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFFECACA)),
            ),
            child: Row(children: [
              const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 18),
              const SizedBox(width: 8),
              Expanded(child: Text(auth.error!, style: const TextStyle(color: Color(0xFFDC2626), fontSize: 13))),
            ]),
          ),
        ],
        const SizedBox(height: 24),
        SizedBox(
          height: 52,
          child: ElevatedButton(
            onPressed: (auth.isLoading || !auth.serverReachable) ? null : _submit,
            child: auth.isLoading
                ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                : const Text('Sign In'),
          ),
        ),
      ]),
    ),
  );

  Widget _buildFooter() => Text(
    'DaralIraq v3.0  •  Enterprise Edition',
    style: TextStyle(fontSize: 11, color: Colors.white.withAlpha(115)),
    textAlign: TextAlign.center,
  );
}

class _ServerStatus extends StatelessWidget {
  final AuthState auth;
  final VoidCallback onRetry;
  const _ServerStatus({required this.auth, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    if (auth.checkingConn) {
      return _chip(const Color(0xFFF1F5F9), const Color(0xFF94A3B8),
          Icons.wifi_find_outlined, 'Connecting to server…');
    }
    if (!auth.serverReachable) {
      return GestureDetector(
        onTap: onRetry,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFFEF2F2),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFFECACA)),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Row(children: [
              Icon(Icons.wifi_off_outlined, color: Color(0xFFDC2626), size: 16),
              SizedBox(width: 6),
              Text('Server unreachable',
                  style: TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.w600, fontSize: 13)),
            ]),
            const SizedBox(height: 4),
            Text(ApiEndpoints.baseUrl, style: const TextStyle(color: Color(0xFFEF4444), fontSize: 11)),
            const SizedBox(height: 4),
            const Text('Tap to retry',
                style: TextStyle(color: Color(0xFFDC2626), fontSize: 12, decoration: TextDecoration.underline)),
          ]),
        ),
      );
    }
    return _chip(const Color(0xFFF0FDF4), const Color(0xFF16A34A), Icons.wifi_outlined, 'Server connected');
  }

  Widget _chip(Color bg, Color fg, IconData icon, String label) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, color: fg, size: 15),
      const SizedBox(width: 6),
      Text(label, style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w500)),
    ]),
  );
}
