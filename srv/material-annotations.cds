using { MaterialService } from './material-service';

annotate MaterialService.Materials with @(
    UI.HeaderInfo: {
        TypeName: 'Material',
        TypeNamePlural: 'Materials',
        Title: { Value: name },
        Description: { Value: plant }
    },

    UI.LineItem: [
        { Value: ID },
        { Value: name },
        { Value: plant },
        { Value: quantity },
        { Value: supplier.name, Label: 'Supplier' }
    ],

    UI.Facets: [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Material Details',
            Target: '@UI.FieldGroup#Main'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Inspections',
            Target: 'inspections/@UI.LineItem'
        }
    ],

    UI.FieldGroup#Main: {
        Data: [
            { Value: name },
            { Value: plant },
            { Value: quantity },
            { Value: supplier_ID, Label: 'Supplier' }
        ]
    }
);

annotate MaterialService.Inspections with @(
    UI.LineItem: [
        { Value: ID },
        { Value: result }
    ]
);