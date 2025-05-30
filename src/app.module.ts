import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { DoctorModule } from './doctor/doctor.module';
import { AppointmentModule } from './appointment/appointment.module';
import { SpecialtyModule } from './specialty/specialty.module';
import { MedicalOptionModule } from './medical-option/medical-option.module';
import { RemoteMedicalOptionModule } from './remote-medical-option/remote-medical-option.module';
import { FaqitemModule } from './faqitem/faqitem.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { PostModule } from './post/post.module';
import { FirebaseModule } from './firebase/firebase.module';
import { ReviewModule } from './review/review.module';
import config from './config/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { CacheService } from './cache.service';
import { ReportModule } from './report/report.module';
import { PostFavoriteModule } from './post-favorite/post-favorite.module';
import { PostCommentModule } from './post-comment/post-comment.module';
import { NotificationModule } from './notification/notification.module';
import { UserModule } from './user/user.module';
import { NewsModule } from './news/news.module';
import { NewsCommentModule } from './news-comment/news-comment.module';
import { NewsFavoriteModule } from './news-favorite/news-favorite.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [config],
    }),
    JwtModule.register({ global: true, secret: "secretKey" }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isDev = configService.get<string>('isDev') === 'true';
        const uri = isDev
          ? configService.get<string>('MONGO_URI_DEV')
          : configService.get<string>('MONGO_URI_PROD');

        return { uri };
      },
      inject: [ConfigService],
    }),
    CacheModule.register({
      store: redisStore,
      ttl: 3600 * 1000, // mặc định TTL
      url: 'rediss://red-d071mk9r0fns7383v3j0:DeNbSrFT3rDj2vhGDGoX4Pr2DgHUBP8H@singapore-keyvalue.render.com:6379',
      isGlobal: true,
    }),
    AdminModule,
    AuthModule,
    DoctorModule,
    AppointmentModule,
    SpecialtyModule,
    MedicalOptionModule,
    RemoteMedicalOptionModule,
    FaqitemModule,
    CloudinaryModule,
    PostModule,
    FirebaseModule,
    PostModule,
    ReviewModule,
    ReportModule,
    PostFavoriteModule,
    PostCommentModule,
    NotificationModule,
    UserModule,
    NewsModule,
    NewsCommentModule,
    NewsFavoriteModule,
  ],
  controllers: [AppController],
  providers: [AppService, CacheService],
})
export class AppModule { }