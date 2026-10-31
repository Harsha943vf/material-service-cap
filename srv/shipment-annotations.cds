using { ShipmentService } from './shipment-service';

annotate ShipmentService.Shipments with @(
    UI.HeaderInfo: {
        TypeName: 'Shipment',
        TypeNamePlural: 'Shipments',
        Title: { Value: reference },
        Description: { Value: status }
    },

    UI.LineItem: [
        { Value: reference },
        { Value: status },
        { Value: region },
        { Value: carrier.name, Label: 'Carrier' },

        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'ShipmentService.assignCarrier',
            Label  : 'Assign Carrier'
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'ShipmentService.reportException',
            Label  : 'Report Exception'
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'ShipmentService.resolveException',
            Label  : 'Resolve Exception'
        },
        {
            $Type  : 'UI.DataFieldForAction',
            Action : 'ShipmentService.closeShipment',
            Label  : 'Close Shipment'
        }
    ],

    UI.Facets: [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Shipment Details',
            Target: '@UI.FieldGroup#Main'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Exception History',
            Target: 'exceptions/@UI.LineItem'
        }
    ],

    UI.FieldGroup#Main: {
        Data: [
            { Value: reference },
            { Value: status },
            { Value: region },
            { Value: carrier_ID, Label: 'Carrier' }
        ]
    }
);

annotate ShipmentService.ShipmentExceptions with @(
    UI.LineItem: [
        { Value: reason },
        { Value: createdAt, Label: 'Reported At' },
        { Value: resolvedAt, Label: 'Resolved At' },
        { Value: resolvedBy }
    ]
);