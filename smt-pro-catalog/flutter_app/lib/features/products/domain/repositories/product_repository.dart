import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/product.dart';

abstract class ProductRepository {
  Future<Either<Failure, ({List<Product> products, Map<String, dynamic> pagination})>>
      getProducts(Map<String, dynamic> params);

  Future<Either<Failure, ({Product product, List<Product> related})>>
      getProductById(String id);

  Future<Either<Failure, Product>> createProduct(Map<String, dynamic> data);

  Future<Either<Failure, Product>> updateProduct(String id, Map<String, dynamic> data);

  Future<Either<Failure, bool>> deleteProduct(String id);
}
