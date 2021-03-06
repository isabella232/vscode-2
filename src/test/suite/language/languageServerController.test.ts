import { before, after } from 'mocha';
import TelemetryService from '../../../telemetry/telemetryService';

import path from 'path';
import fs from 'fs';
import sinon from 'sinon';
import chai from 'chai';
const expect = chai.expect;

chai.use(require('chai-as-promised'));

import { PlaygroundController } from '../../../editors';
import { LanguageServerController } from '../../../language';
import ConnectionController from '../../../connectionController';
import { StatusView } from '../../../views';
import { StorageController } from '../../../storage';
import { TestExtensionContext } from '../stubs';
import { mdbTestExtension } from '../stubbableMdbExtension';
import PlaygroundResultProvider from '../../../editors/playgroundResultProvider';
import ActiveDBCodeLensProvider from '../../../editors/activeConnectionCodeLensProvider';
import PartialExecutionCodeLensProvider from '../../../editors/partialExecutionCodeLensProvider';
import EditDocumentCodeLensProvider from '../../../editors/editDocumentCodeLensProvider';

const CONNECTION = {
  driverUrlWithSsh: 'mongodb://localhost:27018',
  driverOptions: {}
};

suite('Language Server Controller Test Suite', () => {
  const mockExtensionContext = new TestExtensionContext();

  mockExtensionContext.extensionPath = '../../';

  const mockStorageController = new StorageController(mockExtensionContext);
  const testLanguageServerController = new LanguageServerController(
    mockExtensionContext
  );
  const testTelemetryService = new TelemetryService(
    mockStorageController,
    mockExtensionContext
  );
  const testStatusView = new StatusView(mockExtensionContext);
  const testConnectionController = new ConnectionController(
    testStatusView,
    mockStorageController,
    testTelemetryService
  );
  const testEditDocumentCodeLensProvider = new EditDocumentCodeLensProvider(
    testConnectionController
  );
  const testPlaygroundResultProvider = new PlaygroundResultProvider(
    testConnectionController,
    testEditDocumentCodeLensProvider
  );
  const testActiveDBCodeLensProvider = new ActiveDBCodeLensProvider(
    testConnectionController
  );
  const testPartialExecutionCodeLensProvider = new PartialExecutionCodeLensProvider();
  const testPlaygroundController = new PlaygroundController(
    mockExtensionContext,
    testConnectionController,
    testLanguageServerController,
    testTelemetryService,
    testStatusView,
    testPlaygroundResultProvider,
    testActiveDBCodeLensProvider,
    testPartialExecutionCodeLensProvider
  );

  before(async () => {
    await testLanguageServerController.startLanguageServer();

    testConnectionController.getActiveConnectionName = sinon.fake.returns(
      'fakeName'
    );
    testConnectionController.getActiveConnectionModel = sinon.fake.returns({
      appname: 'VSCode Playground Tests',
      port: 27018,
      disconnect: () => {},
      getAttributes: () => CONNECTION
    });

    await testPlaygroundController._connectToServiceProvider();
  });

  after(() => {
    sinon.restore();
  });

  test('cancel a long-running script', async () => {
    expect(testLanguageServerController._isExecutingInProgress).to.equal(false);

    await testLanguageServerController.executeAll(`
      const names = [
        "flour",
        "butter",
        "water",
        "salt",
        "onions",
        "leek"
      ];
      let currentName = '';
      names.forEach((name) => {
        setTimeout(() => {
          currentName = name;
        }, 500);
      });
      currentName
    `);

    testLanguageServerController.cancelAll();
    expect(testLanguageServerController._isExecutingInProgress).to.equal(false);
  });

  test('the language server dependency bundle exists', () => {
    const extensionPath = mdbTestExtension.testExtensionContext.extensionPath;

    const languageServerModuleBundlePath = path.join(
      extensionPath,
      'dist',
      'languageServer.js'
    );

    // eslint-disable-next-line no-sync
    expect(fs.existsSync(languageServerModuleBundlePath)).to.equal(true);
  });
});
