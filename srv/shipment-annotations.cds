using { ShipmentService } from './shipment-service';
annotate ShipmentService.Shipments with @(
    UI.SelectionFields: [ status, region ]
);
annotate ShipmentService.Shipments with @(
    UI.HeaderInfo: {
        TypeName: 'Shipment',
        TypeNamePlural: 'Shipments',
        Title: { Value: reference },
        Description: { Value: status }
    },

    UI.Identification: [
    { $Type: 'UI.DataFieldForAction', Action: 'ShipmentService.updateReference',   Label: '{i18n>EditReference}' },
    { $Type: 'UI.DataFieldForAction', Action: 'ShipmentService.assignCarrier',     Label: '{i18n>AssignCarrier}' },
    { $Type: 'UI.DataFieldForAction', Action: 'ShipmentService.reportException',   Label: '{i18n>ReportException}' },
    { $Type: 'UI.DataFieldForAction', Action: 'ShipmentService.resolveException',  Label: '{i18n>ResolveException}' },
    { $Type: 'UI.DataFieldForAction', Action: 'ShipmentService.closeShipment',     Label: '{i18n>CloseShipment}' }
],

    UI.LineItem: [
    { Value: reference },
    { Value: status },
    { Value: region },
    { Value: carrier.name, Label: 'Carrier' },
    { Value: daysOpen, Label: 'Days Open' }
],

    UI.Facets: [
        { $Type: 'UI.ReferenceFacet', Label: 'Shipment Details',  Target: '@UI.FieldGroup#Main' },
        { $Type: 'UI.ReferenceFacet', Label: 'Exception History', Target: 'exceptions/@UI.LineItem' }
    ],

    UI.FieldGroup#Main: {
        Data: [
            { Value: reference },
            { Value: status },
            { Value: region },
            { Value: carrier.name, Label: 'Carrier' }
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

annotate ShipmentService.Carriers with @(
    UI.HeaderInfo: {
        TypeName: 'Carrier',
        TypeNamePlural: 'Carriers',
        Title: { Value: name }
    },
    UI.LineItem: [
        { Value: ID },
        { Value: name }
    ],
    UI.Facets: [
        { $Type: 'UI.ReferenceFacet', Label: 'Carrier Details', Target: '@UI.FieldGroup#Main' }
    ],
    UI.FieldGroup#Main: {
        Data: [ { Value: name } ]
    }
);