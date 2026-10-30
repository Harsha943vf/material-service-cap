import cds from '@sap/cds';
import shipmentTests from './suites/shipment.js';
import materialTests from './suites/material.js';
import shipmentStateTests from './suites/shipment-state.js';

const test = cds.test(import.meta.dirname + '/..');

shipmentTests(test);
materialTests(test);
shipmentStateTests(test);