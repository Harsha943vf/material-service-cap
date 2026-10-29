namespace shipment.practice;

using { managed } from '@sap/cds/common';

entity Carriers {
    key ID : Integer;
        name : String(100);
}

entity Shipments : managed {
    key ID          : Integer;
        reference   : String(50);
        status      : String(20) default 'Open';
        region      : String(10);
        carrier     : Association to Carriers;
        exceptionReason : String(500);
}