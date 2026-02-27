import { Injectable, OnModuleInit } from '@nestjs/common';
import { loadRuntimeConfig } from './env.validation';

@Injectable()
export class EnvValidationService implements OnModuleInit {
  onModuleInit() {
    loadRuntimeConfig();
  }
}
