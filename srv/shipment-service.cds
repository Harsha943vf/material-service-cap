using { shipment.practice as db } from '../db/shipment';

service ShipmentService {

    @restrict: [
        {
            grant: 'READ',
            to: 'ShipmentViewer',
            where: 'region = $user.region'
        },
        {
            grant: ['assignCarrier', 'reportException'],
            to: 'ShipmentOperator',
            where: 'region = $user.region'
        },
        {
            grant: 'closeShipment',
            to: 'ShipmentManager',
            where: 'region = $user.region'
        }
    ]
    entity Shipments as projection on db.Shipments
        actions {
            action assignCarrier(
                carrierID : Integer
            ) returns String;

            action reportException(
                reason : String(500)
            ) returns String;

            action closeShipment()
                returns String;
        };

    entity Carriers as projection on db.Carriers;
}