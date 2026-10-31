namespace shipment.practice;

using { managed, cuid } from '@sap/cds/common';

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
        exceptions      : Composition of many ShipmentExceptions
                            on exceptions.shipment = $self;
}

annotate Shipments with @odata.etag: modifiedAt;

entity ShipmentExceptions : cuid, managed {
    shipment   : Association to Shipments;
    reason     : String(500);
    resolvedAt : Timestamp;
    resolvedBy : String(255);
}