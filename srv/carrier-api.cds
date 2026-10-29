service CarrierAPI @(path: '/carrier-api') {

    entity Carriers {
        key ID : Integer;
        name   : String(100);
        code   : String(20);
        active : Boolean;
    }
}