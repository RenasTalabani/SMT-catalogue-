import 'dart:convert';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';

/// Simple key-value offline cache backed by SQLite.
/// Stores JSON strings with an entity type and ID so callers can query by type.
class OfflineCache {
  OfflineCache._();
  static final OfflineCache instance = OfflineCache._();

  Database? _db;

  Future<Database> get _database async {
    _db ??= await _open();
    return _db!;
  }

  Future<Database> _open() async {
    final path = join(await getDatabasesPath(), 'smt_offline.db');
    return openDatabase(
      path,
      version: 1,
      onCreate: (db, _) async {
        await db.execute('''
          CREATE TABLE cache (
            entity TEXT NOT NULL,
            id     TEXT NOT NULL,
            data   TEXT NOT NULL,
            ts     INTEGER NOT NULL,
            PRIMARY KEY (entity, id)
          )
        ''');
        await db.execute('CREATE INDEX idx_entity ON cache (entity)');
      },
    );
  }

  Future<void> put(String entity, String id, Map<String, dynamic> data) async {
    final db = await _database;
    await db.insert(
      'cache',
      {'entity': entity, 'id': id, 'data': jsonEncode(data), 'ts': DateTime.now().millisecondsSinceEpoch},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<Map<String, dynamic>?> get(String entity, String id) async {
    final db  = await _database;
    final rows = await db.query('cache', where: 'entity = ? AND id = ?', whereArgs: [entity, id]);
    if (rows.isEmpty) return null;
    return jsonDecode(rows.first['data'] as String) as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> getAll(String entity) async {
    final db   = await _database;
    final rows = await db.query('cache', where: 'entity = ?', whereArgs: [entity], orderBy: 'ts DESC');
    return rows.map((r) => jsonDecode(r['data'] as String) as Map<String, dynamic>).toList();
  }

  Future<void> remove(String entity, String id) async {
    final db = await _database;
    await db.delete('cache', where: 'entity = ? AND id = ?', whereArgs: [entity, id]);
  }

  Future<void> clearEntity(String entity) async {
    final db = await _database;
    await db.delete('cache', where: 'entity = ?', whereArgs: [entity]);
  }

  /// Purge entries older than [maxAge].
  Future<void> evict(Duration maxAge) async {
    final db      = await _database;
    final cutoff  = DateTime.now().subtract(maxAge).millisecondsSinceEpoch;
    await db.delete('cache', where: 'ts < ?', whereArgs: [cutoff]);
  }
}
