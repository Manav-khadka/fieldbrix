import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getService: () => ({
              service: 'fieldbrix-api',
              status: 'online',
              environment: 'test',
            }),
            getLiveness: () => ({ status: 'live' }),
            getReadiness: () =>
              Promise.resolve({
                status: 'ready',
                database: 'ok',
                objectStorage: 'ok',
                queue: 'ok',
              }),
            getVersion: () => ({
              service: 'fieldbrix-api',
              version: '0.0.1',
              commitSha: 'development',
              buildTime: null,
            }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('reports the service and liveness state', () => {
      expect(appController.getService()).toMatchObject({
        service: 'fieldbrix-api',
        status: 'online',
      });
      expect(appController.getLiveness()).toEqual({ status: 'live' });
    });

    it('exposes immutable release evidence without host details', () => {
      expect(appController.getVersion()).toEqual({
        service: 'fieldbrix-api',
        version: '0.0.1',
        commitSha: 'development',
        buildTime: null,
      });
    });
  });
});
