import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { Review, ReviewSchema } from 'src/schemas/review.schema';
import { CacheService } from 'src/cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Review.name, schema: ReviewSchema }])
  ],
  controllers: [ReviewController],
  providers: [ReviewService, CacheService],
})
export class ReviewModule { }
