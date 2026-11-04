using { MaterialService } from './material-service';
annotate MaterialService.Suppliers with @(
    Common.Text: { $value: name, ![@UI.TextArrangement]: #TextOnly }
);
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
annotate MaterialService.Suppliers with @(
    UI.HeaderInfo: {
        TypeName: 'Supplier',
        TypeNamePlural: 'Suppliers',
        Title: { Value: name }
    },
    UI.LineItem: [
        { Value: ID },
        { Value: name }
    ],
    UI.Facets: [
        { $Type: 'UI.ReferenceFacet', Label: 'Supplier Details', Target: '@UI.FieldGroup#Main' }
    ],
    UI.FieldGroup#Main: {
        Data: [ { Value: name } ]
    }
);