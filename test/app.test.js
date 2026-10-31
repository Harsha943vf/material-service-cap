import cds from '@sap/cds';
import shipmentTests from './suites/shipment.js';
import materialTests from './suites/material.js';
import shipmentStateTests from './suites/shipment-state.js';
import shipmentExceptionTests from './suites/shipment-exceptions.js';
import shipmentEtagTests from './suites/shipment-etag.js';

const test = cds.test(import.meta.dirname + '/..');

shipmentTests(test);
materialTests(test);
shipmentStateTests(test);
shipmentExceptionTests(test);
shipmentEtagTests(test);