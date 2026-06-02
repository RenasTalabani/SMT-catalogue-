import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class BarcodeScannerScreen extends StatefulWidget {
  const BarcodeScannerScreen({super.key});

  @override
  State<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<BarcodeScannerScreen> {
  final MobileScannerController _ctrl = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
    torchEnabled: false,
  );

  bool _loading  = false;
  bool _torchOn  = false;
  String? _error;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code == null || _loading) return;

    setState(() { _loading = true; _error = null; });

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token') ?? '';
      final backendUrl = prefs.getString('backend_url') ?? 'https://amusing-charisma-production-50fc.up.railway.app';

      final dio   = Dio();
      final res   = await dio.get(
        '$backendUrl/api/products/barcode/$code',
        options: Options(headers: { 'Authorization': 'Bearer $token' }),
      );

      final product = (res.data as Map<String, dynamic>)['data'] as Map<String, dynamic>;

      if (mounted) {
        await _ctrl.stop();
        Navigator.of(context).pop(product);
      }
    } on DioException catch (e) {
      final statusCode = e.response?.statusCode;
      setState(() {
        _error = statusCode == 404
            ? 'Product not found for barcode: $code'
            : 'Error: ${e.message}';
        _loading = false;
      });
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => _error = null);
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Scan Barcode'),
        actions: [
          IconButton(
            icon: Icon(_torchOn ? Icons.flashlight_off : Icons.flashlight_on),
            onPressed: () { _ctrl.toggleTorch(); setState(() => _torchOn = !_torchOn); },
          ),
          IconButton(
            icon: const Icon(Icons.flip_camera_android),
            onPressed: () => _ctrl.switchCamera(),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Camera view
          MobileScanner(controller: _ctrl, onDetect: _onDetect),

          // Overlay with scan window
          CustomPaint(
            painter: _ScanOverlayPainter(),
            child: const SizedBox.expand(),
          ),

          // Instructions
          Positioned(
            bottom: 60,
            left: 0,
            right: 0,
            child: Column(
              children: [
                if (_loading)
                  const Column(
                    children: [
                      CircularProgressIndicator(color: Colors.white),
                      SizedBox(height: 12),
                      Text('Looking up product…', style: TextStyle(color: Colors.white)),
                    ],
                  )
                else if (_error != null)
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 32),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.red.withAlpha(200),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(_error!, style: const TextStyle(color: Colors.white), textAlign: TextAlign.center),
                  )
                else
                  const Text(
                    'Point camera at barcode or QR code',
                    style: TextStyle(color: Colors.white70, fontSize: 14),
                  ),

                const SizedBox(height: 20),

                // Manual entry button
                TextButton.icon(
                  onPressed: () => _showManualEntry(context),
                  icon: const Icon(Icons.keyboard, color: Colors.white70),
                  label: const Text('Enter barcode manually', style: TextStyle(color: Colors.white70)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showManualEntry(BuildContext context) {
    final controller = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF1A1A2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 24, right: 24, top: 24,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Enter Barcode / SKU', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              autofocus: true,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'e.g. 1234567890 or SKU-001',
                hintStyle: const TextStyle(color: Colors.white38),
                filled: true,
                fillColor: const Color(0xFF0D0D1A),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  final code = controller.text.trim();
                  if (code.isEmpty) return;
                  Navigator.of(ctx).pop();
                  _onDetect(BarcodeCapture(
                    barcodes: [Barcode(rawValue: code)],
                    image: null,
                    size: Size.zero,
                  ));
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6C5CE7),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Search Product', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Draws the dark overlay with a clear scan window in the center
class _ScanOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    const windowSize = 260.0;
    final cx = size.width  / 2;
    final cy = size.height / 2 - 30;
    final rect = Rect.fromCenter(center: Offset(cx, cy), width: windowSize, height: windowSize);

    final paint = Paint()..color = Colors.black54;
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height)),
        Path()..addRRect(RRect.fromRectAndRadius(rect, const Radius.circular(16))),
      ),
      paint,
    );

    // Corner brackets
    final bracketPaint = Paint()
      ..color = const Color(0xFF6C5CE7)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;
    const len = 28.0;

    for (final corner in [
      [rect.topLeft,     Offset(rect.left + len, rect.top),    Offset(rect.left,  rect.top + len)],
      [rect.topRight,    Offset(rect.right - len, rect.top),   Offset(rect.right, rect.top + len)],
      [rect.bottomLeft,  Offset(rect.left + len, rect.bottom), Offset(rect.left,  rect.bottom - len)],
      [rect.bottomRight, Offset(rect.right - len, rect.bottom),Offset(rect.right, rect.bottom - len)],
    ]) {
      canvas.drawLine(corner[0] as Offset, corner[1] as Offset, bracketPaint);
      canvas.drawLine(corner[0] as Offset, corner[2] as Offset, bracketPaint);
    }
  }

  @override
  bool shouldRepaint(_) => false;
}
