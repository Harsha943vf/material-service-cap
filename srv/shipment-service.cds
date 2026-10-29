using { shipment.practice as db } from '../db/shipment';

service ShipmentService {

    @restrict: [
        {
            grant: 'READ',
            to: 'ShipmentViewer',
            where: 'region = $user.region'
        }
    ]
    entity Shipments as projection on db.Shipments;

    entity Carriers as projection on db.Carriers;

    @requires: 'ShipmentOperator'
    action assignCarrier(
        shipmentID : Integer,
        carrierID  : Integer
    ) returns String;

    @requires: 'ShipmentOperator'
    action reportException(
        shipmentID : Integer,
        reason     : String(500)
    ) returns String;

    @requires: 'ShipmentManager'
    action closeShipment(
        shipmentID : Integer
    ) returns String;
}