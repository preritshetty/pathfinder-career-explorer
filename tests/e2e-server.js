import {createApp} from '../server/app.js';
import {fixtureGenerate} from './fixtures.js';
createApp({generate:fixtureGenerate}).listen(3099,'127.0.0.1');
