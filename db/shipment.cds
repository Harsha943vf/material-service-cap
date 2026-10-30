namespace shipment.practice;

using { managed } from '@sap/cds/common';

// Allowed shipment states
type ShipmentStatus : String(20) enum {
    Open;
    Exception;
    Closed;
}

entity Carriers {
    key ID   : Integer;
        name : String(100);
}

entity Shipments : managed {
    key ID              : Integer;
        reference       : String(50);

        @assert.range
        status          : ShipmentStatus default 'Open';

        region          : String(10);
        carrier         : Association to Carriers;
        exceptionReason : String(500);
}