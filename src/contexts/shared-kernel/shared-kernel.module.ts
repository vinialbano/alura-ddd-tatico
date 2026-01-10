import { Module } from '@nestjs/common';

/**
 * SharedKernelModule
 *
 * Strategic DDD Pattern: Shared Kernel
 *
 * Contains contracts and types that multiple bounded contexts
 * agree to share for direct integration. This module defines
 * the "what" (interfaces) but not the "how" (implementations).
 *
 * Contents:
 * - Integration contracts between bounded contexts
 * - Common value objects that cross context boundaries
 * - Shared domain concepts with identical meaning across contexts
 *
 * Guidelines:
 * - Keep minimal - only truly shared concepts belong here
 * - Contracts only, implementations provided by owning contexts
 * - Changes here require coordination between all dependent contexts
 */
@Module({
  providers: [],
  exports: [],
})
export class SharedKernelModule {}
