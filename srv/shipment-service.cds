using { shipment.practice as db } from '../db/shipment';

service ShipmentService {

    @restrict: [
        {
            grant: 'READ',
            to: 'ShipmentViewer',
            where: 'region = $user.region'
        },
        {
            grant: ['assignCarrier', 'reportException', 'resolveException', 'updateReference'],
            to: 'ShipmentOperator',
            where: 'region = $user.region'
        },
        {
            grant: 'closeShipment',
            to: 'ShipmentManager',
            where: 'region = $user.region'
        },
        {
            grant: '*',
            to: 'ShipmentAdmin'
        }
    ]
    entity Shipments as projection on db.Shipments
        actions {
            action assignCarrier(
                carrierID : Integer,
                expectedModifiedAt : Timestamp
            ) returns String;

            action reportException(
                reason : String(500),
                expectedModifiedAt : Timestamp
            ) returns String;

            action resolveException(
                expectedModifiedAt : Timestamp
            ) returns String;

            action closeShipment(
                expectedModifiedAt : Timestamp
            ) returns String;

            action updateReference(
                reference : String(50),
                expectedModifiedAt : Timestamp
            ) returns String;
        };

    entity Carriers as projection on db.Carriers;

    @readonly
    @restrict: [
        {
            grant: 'READ',
            to: 'ShipmentViewer',
            where: 'shipment.region = $user.region'
        },
        {
            grant: 'READ',
            to: 'ShipmentAdmin'
        }
    ]
    entity ShipmentExceptions as projection on db.ShipmentExceptions;

    @readonly
    @restrict: [
        { grant: 'READ', to: 'ShipmentManager' },
        { grant: 'READ', to: 'ShipmentAdmin' }
    ]
    entity AuditLog as projection on db.AuditLog;

    event ShipmentClosed : {
        ID        : Integer;
        reference : String(50);
        region    : String(10);
        closedBy  : String(255);
    }

    event ExceptionReported : {
        ID         : Integer;
        reference  : String(50);
        reason     : String(500);
        reportedBy : String(255);
    }

    event ExceptionResolved : {
        ID         : Integer;
        reference  : String(50);
        resolvedBy : String(255);
    }

    event CarrierAssigned : {
        ID          : Integer;
        reference   : String(50);
        carrierID   : Integer;
        carrierName : String(100);
        assignedBy  : String(255);
    }

    function getStatusSummary() returns {
        open      : Integer;
        exception : Integer;
        closed    : Integer;
    };
}