import 'package:dartz/dartz.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/product.dart';
import '../../domain/repositories/product_repository.dart';
import '../datasources/product_remote_datasource.dart';

class ProductRepositoryImpl implements ProductRepository {
  final ProductRemoteDataSource remoteDataSource;
  const ProductRepositoryImpl(this.remoteDataSource);

  @override
  Future<Either<Failure, ({List<Product> products, Map<String, dynamic> pagination})>>
      getProducts(Map<String, dynamic> params) async {
    try {
      final result = await remoteDataSource.getProducts(params);
      return Right((products: result.products, pagination: result.pagination));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnknownFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, ({Product product, List<Product> related})>> getProductById(
      String id) async {
    try {
      final result = await remoteDataSource.getProductById(id);
      return Right((product: result.product, related: result.related));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } on NotFoundException {
      return const Left(NotFoundFailure('Product not found'));
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnknownFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, Product>> createProduct(Map<String, dynamic> data) async {
    try {
      final product = await remoteDataSource.createProduct(data);
      return Right(product);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnknownFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, Product>> updateProduct(String id, Map<String, dynamic> data) async {
    try {
      final product = await remoteDataSource.updateProduct(id, data);
      return Right(product);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnknownFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, bool>> deleteProduct(String id) async {
    try {
      await remoteDataSource.deleteProduct(id);
      return const Right(true);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnknownFailure(e.toString()));
    }
  }
}
