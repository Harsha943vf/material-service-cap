import cds from '@sap/cds';
import shipmentTests from './suites/shipment.js';
import materialTests from './suites/material.js';

// Start the app ONCE for all suites
const test = cds.test(import.meta.dirname + '/..');

shipmentTests(test);
materialTests(test);