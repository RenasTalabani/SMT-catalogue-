class UserModel {
  final int    id;
  final String name;
  final String email;
  final String role;

  const UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
        id:    json['id'],
        name:  json['name'],
        email: json['email'],
        role:  json['role'],
      );

  bool get isAdmin    => role == 'admin';
  bool get isEmployee => role == 'employee';
}
