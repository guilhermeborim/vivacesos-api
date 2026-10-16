import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AvailabilityRange } from './availability.js';
import { ProfessionalAvailability } from './entities/professional-availability.entity.js';

@Injectable()
export class AvailabilityRepository {
  constructor(
    @InjectRepository(ProfessionalAvailability)
    private readonly repository: Repository<ProfessionalAvailability>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findRanges(professionalId: string): Promise<AvailabilityRange[]> {
    const rows = await this.repository.find({
      where: { professionalId },
      order: { weekday: 'ASC', startMinute: 'ASC' },
    });
    return rows.map((r) => ({
      weekday: r.weekday,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
    }));
  }

  /** Troca a agenda do profissional de uma vez (flag + faixas), numa transação. */
  replace(
    professionalId: string,
    restricted: boolean,
    ranges: AvailabilityRange[],
  ) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE professionals SET "availabilityRestricted" = $2 WHERE id = $1`,
        [professionalId, restricted],
      );
      await manager.delete(ProfessionalAvailability, { professionalId });
      if (ranges.length) {
        await manager.insert(
          ProfessionalAvailability,
          ranges.map((r) => ({ professionalId, ...r })),
        );
      }
    });
  }
}
