import { Injectable } from '@nestjs/common';
import {
  FindOptionsOrder,
  FindOptionsRelationByString,
  FindOptionsRelations,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { PaginationQueryDto } from '../dtos/pagination-query.dto';
import { Paginated } from '../interfaces/paginated.interface';

@Injectable()
export class PaginationProvider {
  constructor() {}

  public async paginateQuery<T extends ObjectLiteral>(
    paginationQuery: PaginationQueryDto,
    repository: Repository<T>,
    whereCondition?: FindOptionsWhere<T>[] | FindOptionsWhere<T>,
    relations?: FindOptionsRelations<T> | FindOptionsRelationByString,
    order?: FindOptionsOrder<T>,
  ): Promise<Paginated<T>> {
    const limit = paginationQuery.limit || 10;
    const page = paginationQuery.page || 1;
    const skip = (page - 1) * limit;

    let results: T[] = [];
    let totalItems = 0;

    // Standard pagination if no specific conversation ID is provided
    [results, totalItems] = await repository.findAndCount({
      where: whereCondition,
      relations: relations,
      order: order,
      skip: skip,
      take: limit,
    });

    let finalResponse = {
      data: results,
      meta: {
        itemsPerPage: limit,
        totalItems: totalItems,
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
      },
    };

    return finalResponse;
  }

  public async paginateQueryBuilder<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    paginationQuery: PaginationQueryDto,
    specificObject?: T,
  ): Promise<Paginated<T>> {
    const limit = paginationQuery.limit || 10;
    const page = paginationQuery.page || 1;
    const skip = (page - 1) * limit;

    let results: T[] = [];
    let totalItems = 0;
    if (specificObject) {
      queryBuilder.andWhere('chat.id != :first_id', {
        first_id: specificObject.id,
      });
      if (page === 1) {
        // Fetch remaining Objects with pagination
        const [remainingObjects, remainingCount] = await queryBuilder
          .skip(skip)
          .take(limit - (specificObject ? 1 : 0))
          .getManyAndCount();

        // Combine specific Object with the remaining paginated results
        if (specificObject) {
          results = [specificObject, ...remainingObjects];
        } else {
          results = remainingObjects;
        }
        totalItems = remainingCount + (specificObject ? 1 : 0);
      } else {
        // Fetch remaining Objects with pagination
        const [remainingObjects, remainingCount] = await queryBuilder
          .skip(skip - 1)
          .take(limit)
          .getManyAndCount();
        results = remainingObjects;
        totalItems = remainingCount + (specificObject ? 1 : 0);
      }
    } else {
      // Apply pagination to the query
      [results, totalItems] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();
    }

    let finalResponse = {
      data: results,
      meta: {
        itemsPerPage: limit,
        totalItems: totalItems,
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
      },
    };

    return finalResponse;
  }
}
