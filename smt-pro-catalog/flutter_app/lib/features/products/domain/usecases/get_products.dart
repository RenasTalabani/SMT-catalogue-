import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/product.dart';
import '../repositories/product_repository.dart';

class GetProducts
    implements
        UseCase<({List<Product> products, Map<String, dynamic> pagination}),
            GetProductsParams> {
  final ProductRepository repository;
  const GetProducts(this.repository);

  @override
  Future<Either<Failure, ({List<Product> products, Map<String, dynamic> pagination})>>
      call(GetProductsParams params) {
    return repository.getProducts(params.toMap());
  }
}

class GetProductsParams extends Equatable {
  final int page;
  final int limit;
  final String? search;
  final String? category;
  final String? subCategory;
  final double? minPrice;
  final double? maxPrice;
  final List<String>? tags;
  final String sortBy;
  final String sortOrder;
  final bool? featured;

  const GetProductsParams({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.category,
    this.subCategory,
    this.minPrice,
    this.maxPrice,
    this.tags,
    this.sortBy = 'createdAt',
    this.sortOrder = 'desc',
    this.featured,
  });

  Map<String, dynamic> toMap() {
    return {
      'page': page,
      'limit': limit,
      if (search != null && search!.isNotEmpty) 'search': search,
      if (category != null) 'category': category,
      if (subCategory != null) 'subCategory': subCategory,
      if (minPrice != null) 'minPrice': minPrice,
      if (maxPrice != null) 'maxPrice': maxPrice,
      if (tags != null && tags!.isNotEmpty) 'tags': tags!.join(','),
      'sortBy': sortBy,
      'sortOrder': sortOrder,
      if (featured != null) 'featured': featured.toString(),
    };
  }

  GetProductsParams copyWith({
    int? page,
    int? limit,
    String? search,
    String? category,
    String? subCategory,
    double? minPrice,
    double? maxPrice,
    List<String>? tags,
    String? sortBy,
    String? sortOrder,
    bool? featured,
  }) {
    return GetProductsParams(
      page: page ?? this.page,
      limit: limit ?? this.limit,
      search: search ?? this.search,
      category: category ?? this.category,
      subCategory: subCategory ?? this.subCategory,
      minPrice: minPrice ?? this.minPrice,
      maxPrice: maxPrice ?? this.maxPrice,
      tags: tags ?? this.tags,
      sortBy: sortBy ?? this.sortBy,
      sortOrder: sortOrder ?? this.sortOrder,
      featured: featured ?? this.featured,
    );
  }

  @override
  List<Object?> get props => [
        page, limit, search, category, subCategory,
        minPrice, maxPrice, tags, sortBy, sortOrder, featured,
      ];
}
