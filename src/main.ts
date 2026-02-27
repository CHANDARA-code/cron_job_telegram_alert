import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

const DEFAULT_ALERT_TIMEZONE = 'Asia/Phnom_Penh';

function logStartupTable(appUrl: string) {
  const timezone = process.env.ALERT_TIMEZONE ?? DEFAULT_ALERT_TIMEZONE;
  const bold = '\x1b[1m';
  const cyan = '\x1b[36m';
  const reset = '\x1b[0m';

  console.log(`${bold}${cyan}\nTelegram Alert Service is running${reset}\n`);

  console.table([
    { Item: 'App URL', Value: appUrl },
    { Item: 'Swagger Docs', Value: `${appUrl}/api/docs` },
    { Item: 'Timezone', Value: timezone },
    { Item: 'Daily Alert #1', Value: '6:00 PM (0 18 * * *)' },
    { Item: 'Daily Alert #2', Value: '9:00 PM (0 21 * * *)' },
    { Item: 'Send Now', Value: `POST ${appUrl}/alerts/send-now?time=6pm` },
    { Item: 'Send Now', Value: `POST ${appUrl}/alerts/send-now?time=9pm` },
  ]);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Telegram Alert API')
    .setDescription(
      'API for triggering Telegram alerts and monitoring scheduled reminders.',
    )
    .setVersion('1.0')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  logStartupTable(`http://localhost:${port}`);
}
void bootstrap();
