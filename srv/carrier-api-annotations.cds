using { CarrierAPI } from './carrier-api';

annotate CarrierAPI.Carriers with @(
    UI.HeaderInfo: {
        TypeName: 'Carrier',
        TypeNamePlural: 'Carriers',
        Title: { Value: name },
        Description: { Value: code }
    },

    UI.LineItem: [
        { Value: ID },
        { Value: name },
        { Value: code },
        { Value: active }
    ],

    UI.Facets: [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Carrier Details',
            Target: '@UI.FieldGroup#Main'
        }
    ],

    UI.FieldGroup#Main: {
        Data: [
            { Value: name },
            { Value: code },
            { Value: active }
        ]
    }
);

annotate CarrierAPI.Carriers with {
    active @Common.Text: {
        $value: active,
        ![@UI.TextArrangement]: #TextOnly
    };
};