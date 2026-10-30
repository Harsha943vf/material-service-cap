using { material.service as db } from '../db/schema';

service MaterialService {

    entity Materials as projection on db.Materials
        actions {
            action setMaterialQuantity(
                quantity : Integer
            ) returns String;
        };

    entity Suppliers   as projection on db.Suppliers;
    entity Inspections as projection on db.Inspections;

    action checkQuantity(quantity : Integer) returns String;

    action getMaterialQuantity(materialID : Integer) returns Integer;

    action testRollback(materialID : Integer) returns String;

    function readMaterialQuantity(
        materialID : Integer
    ) returns Integer;
}