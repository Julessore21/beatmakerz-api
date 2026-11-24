import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LicensesService } from './licenses.service';

@ApiTags('licenses')
@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  /** Liste publique des licences (prix, fichiers donnés, termes). */
  @Get()
  list() {
    return this.licensesService.list();
  }
}
