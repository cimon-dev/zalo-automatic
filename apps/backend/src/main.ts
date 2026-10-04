import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Nạp file .env từ thư mục gốc backend
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Cho phép kết nối CORS từ Frontend
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`=====================================================`);
  logger.log(`🚀 Zalo Automation Backend đang chạy tại PORT: ${port}`);
  logger.log(`🔗 WebSocket Gateway sẵn sàng kết nối.`);
  logger.log(`=====================================================`);
}

bootstrap();
