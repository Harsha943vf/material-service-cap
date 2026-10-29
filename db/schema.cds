namespace material.service;
using { managed, cuid } from '@sap/cds/common';

entity Notes : cuid {
    text : String(200);
}
entity Suppliers {
    key ID : Integer;
        name : String(100);

    materials : Association to many Materials
                on materials.supplier = $self;
}

entity Materials : managed {
    key ID       : Integer;
        name     : String(100);
        plant    : String(4);
        quantity : Integer;

        supplier : Association to Suppliers;

        inspections : Composition of many Inspections
                      on inspections.material = $self;
}

entity Inspections {
    key ID       : Integer;
        result   : String(20);
        material : Association to Materials;
}