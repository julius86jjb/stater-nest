import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { Store } from './entities/store.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid';
import { HandleExceptionsService } from 'src/common/services/handle-exceptions.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class StoresService {
  private readonly logger = new Logger('StoresService');

  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    private handleExceptionsService: HandleExceptionsService,

  ) {}

  async create(createStoreDto: CreateStoreDto, user: User) {
    try {
      const store = this.storeRepository.create({
        ...createStoreDto,
        user: user
      });
      await this.storeRepository.save(store);

      return store;
    } catch (error) {
      this.handleExceptionsService.handleDBExceptions(error);
    }
  }

  findAll(paginationDTO: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDTO;

    return this.storeRepository.find({
      take: limit,
      skip: offset,
    });
  }

  async findOne(term: string) {
    let store: Store;

    if (isUUID(term))
      store = await this.storeRepository.findOneBy({ id: term });
    else {
      const queryBuilder = this.storeRepository.createQueryBuilder();
      store = await queryBuilder.where('UPPER(name) = :name or slug =:slug', {
        slug: term.toLowerCase(),
        name: term.toUpperCase(),
      }).getOne();
    }

    if (!store) throw new NotFoundException(`Store with ${term} not found`);

    return store;
  }

  async update(id: string, updateStoreDto: UpdateStoreDto) {
    const store = await this.storeRepository.preload({
      id: id,
      ...updateStoreDto,
    });

    if (!store) throw new NotFoundException(`Store with id: ${id} not found`);

    try {
      await this.storeRepository.save(store);

      return store;
    } catch (error) {
      this.handleExceptionsService.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const store = await this.findOne(id);
    await this.storeRepository.remove(store);
  }

  async deleteAllProducts(){
    const query = this.storeRepository.createQueryBuilder('store')

    try {
      return await query
        .delete()
        .where({})
        .execute()
    } catch (error) {
      this.handleExceptionsService.handleDBExceptions(error);
    }
  }
}
